/**
 * @module components/post/PollDisplay
 * アンケートの投票 UI と結果表示。
 * 初期表示は PostPoll（生成型）から、投票後は PollVoteResponse から共通表示モデルへ正規化して描画する。
 * onSettled の invalidate で最終的にサーバー値へ収束する。
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import {
  colorBorder,
  colorBorderLight,
  colorSuccessBg,
  colorSuccess,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorSurfaceMuted,
  colorErrorBg,
  colorError,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  radiusSm,
  textSm,
  textXs,
  textBase,
} from '@/lib/constants/design-tokens';
import { useVotePollMutation, type PollVoteResponse } from '@/lib/queries/posts';
import { isApiError } from '@/lib/api/errors';
import {
  ERR_POLL_VOTE_FAILED,
  ERR_POLL_ALREADY_VOTED,
  ERR_POLL_ENDED,
} from '@/lib/constants/errors';
import type { components } from '@/lib/api/generated/schema.d.ts';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type PostPoll = components['schemas']['PostPoll'];

// ---------------------------------------------------------------------------
// 表示モデル（PostPoll と PollVoteResponse を統合した内部表現）
// ---------------------------------------------------------------------------

type PollDisplayOption = {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
};

type PollDisplayModel = {
  options: PollDisplayOption[];
  totalVotes: number;
  userVoteOptionId: string | null;
  expiresAt: string;
  isExpired: boolean;
};

/**
 * PostPoll（サーバー初期値）から表示モデルへ正規化する。
 * 投票済み判定は votes[0].optionId、総得票数は _count.votes、
 * 選択肢得票数は各 option._count.votes、期限切れは expiresAt と現在時刻の比較。
 */
function normalizeFromPostPoll(poll: PostPoll, nowMs: number): PollDisplayModel {
  const totalVotes = poll._count.votes;
  const userVoteOptionId = poll.votes !== undefined && poll.votes.length > 0
    ? poll.votes[0].optionId
    : null;
  const isExpired = nowMs >= new Date(poll.expiresAt).getTime();

  const options: PollDisplayOption[] = poll.options.map((opt) => {
    const voteCount = opt._count.votes;
    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    return { id: opt.id, text: opt.text, voteCount, percentage };
  });

  return { options, totalVotes, userVoteOptionId, expiresAt: poll.expiresAt, isExpired };
}

/**
 * PollVoteResponse（投票直後のサーバー応答）から表示モデルへ正規化する。
 * voteCount / percentage / totalVotes / userVoteOptionId / isExpired を直接使用する。
 */
function normalizeFromVoteResponse(res: PollVoteResponse): PollDisplayModel {
  const options: PollDisplayOption[] = res.options.map((opt) => ({
    id: opt.id,
    text: opt.text,
    voteCount: opt.voteCount,
    percentage: opt.percentage,
  }));

  return {
    options,
    totalVotes: res.totalVotes,
    userVoteOptionId: res.userVoteOptionId,
    expiresAt: res.expiresAt,
    isExpired: res.isExpired,
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PollDisplayProps = {
  /** PostResponse.poll の型（生成型 PostPoll）。null のときは描画しない */
  poll: PostPoll | null;
  /** 関連投稿の ID。投票後に posts.detail(postId) を invalidate するために使用 */
  postId?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PollDisplay = React.memo(function PollDisplay({ poll, postId }: PollDisplayProps) {
  if (poll === null) return null;
  return <PollDisplayInner poll={poll} postId={postId} />;
});

type PollDisplayInnerProps = {
  poll: PostPoll;
  postId?: string;
};

function PollDisplayInner({ poll, postId }: PollDisplayInnerProps) {
  const [nowMs] = useState<number>(() => Date.now());
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [voteResult, setVoteResult] = useState<PollVoteResponse | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const voteMutation = useVotePollMutation();

  const displayModel = useMemo<PollDisplayModel>(() => {
    if (voteResult !== null) return normalizeFromVoteResponse(voteResult);
    return normalizeFromPostPoll(poll, nowMs);
  }, [voteResult, poll, nowMs]);

  const { isExpired, userVoteOptionId, totalVotes, expiresAt, options } = displayModel;

  const hasVoted = userVoteOptionId !== null;
  const showResults = hasVoted || isExpired;

  const timeLabel = useMemo(() => {
    if (isExpired) return '終了済み';
    const diffMs = new Date(expiresAt).getTime() - nowMs;
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `残り約 ${diffHours} 時間`;
    const diffDays = Math.ceil(diffHours / 24);
    return `残り約 ${diffDays} 日`;
  }, [isExpired, expiresAt, nowMs]);

  const handleOptionSelect = useCallback((optionId: string) => {
    if (showResults || voteMutation.isPending) return;
    setSelectedOptionId(optionId);
    setVoteError(null);
  }, [showResults, voteMutation.isPending]);

  const handleVote = useCallback(() => {
    if (selectedOptionId === null || voteMutation.isPending) return;
    setVoteError(null);
    voteMutation.mutate(
      { pollId: poll.id, optionId: selectedOptionId, postId },
      {
        onSuccess: (data) => {
          setVoteResult(data);
        },
        onError: (error) => {
          if (isApiError(error)) {
            if (error.code === 'CONFLICT') {
              setVoteError(ERR_POLL_ALREADY_VOTED);
              return;
            }
            if (error.code === 'NOT_FOUND') {
              setVoteError(ERR_POLL_ENDED);
              return;
            }
          }
          setVoteError(ERR_POLL_VOTE_FAILED);
        },
      }
    );
  }, [selectedOptionId, voteMutation, poll.id, postId]);

  return (
    <View style={styles.container}>
      {showResults ? (
        <ResultView
          options={options}
          userVoteOptionId={userVoteOptionId}
        />
      ) : (
        <VoteView
          options={poll.options}
          selectedOptionId={selectedOptionId}
          onSelect={handleOptionSelect}
          onVote={handleVote}
          isPending={voteMutation.isPending}
        />
      )}

      {voteError !== null && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{voteError}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>{totalVotes}票</Text>
        <Text style={styles.footerDot}>・</Text>
        <Text style={styles.footerText}>{timeLabel}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 投票 UI（未投票かつ未終了）
// ---------------------------------------------------------------------------

type VoteViewOption = {
  id: string;
  text: string;
};

type VoteViewProps = {
  options: readonly VoteViewOption[];
  selectedOptionId: string | null;
  onSelect: (id: string) => void;
  onVote: () => void;
  isPending: boolean;
};

function VoteView({ options, selectedOptionId, onSelect, onVote, isPending }: VoteViewProps) {
  return (
    <View style={styles.voteContainer}>
      {options.map((option) => {
        const isSelected = selectedOptionId === option.id;
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [
              styles.optionButton,
              isSelected && styles.optionButtonSelected,
              pressed && !isSelected && styles.optionButtonPressed,
            ]}
            onPress={() => onSelect(option.id)}
            disabled={isPending}
            accessibilityRole="radio"
            accessibilityLabel={option.text}
            accessibilityState={{ checked: isSelected, disabled: isPending }}
          >
            <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <Text style={[styles.optionButtonText, isSelected && styles.optionButtonTextSelected]} numberOfLines={2}>
              {option.text}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        style={({ pressed }) => [
          styles.voteButton,
          selectedOptionId === null && styles.voteButtonDisabled,
          pressed && selectedOptionId !== null && styles.voteButtonPressed,
        ]}
        onPress={onVote}
        disabled={selectedOptionId === null || isPending}
        accessibilityRole="button"
        accessibilityLabel="投票する"
        accessibilityState={{ disabled: selectedOptionId === null || isPending }}
      >
        {isPending ? (
          <ActivityIndicator size="small" color={colorActionPrimaryText} accessibilityLabel="投票中" />
        ) : (
          <Text style={styles.voteButtonText}>投票する</Text>
        )}
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 結果表示（投票済みまたは期限切れ）
// ---------------------------------------------------------------------------

type ResultViewProps = {
  options: PollDisplayOption[];
  userVoteOptionId: string | null;
};

function ResultView({ options, userVoteOptionId }: ResultViewProps) {
  return (
    <View style={styles.resultContainer}>
      {options.map((option) => {
        const isUserVote = userVoteOptionId === option.id;
        const pct = Math.round(option.percentage);

        return (
          <View
            key={option.id}
            style={[styles.resultRow, isUserVote && styles.resultRowOwn]}
            accessibilityLabel={`${option.text} ${pct}%${isUserVote ? ' あなたの選択' : ''}`}
          >
            <View
              style={[styles.resultBar, { width: `${pct}%` }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <View style={styles.resultContent}>
              <Text
                style={[styles.resultText, isUserVote && styles.resultTextOwn]}
                numberOfLines={2}
              >
                {option.text}
                {isUserVote ? ' ✓' : ''}
              </Text>
              <Text style={[styles.resultPct, isUserVote && styles.resultPctOwn]}>
                {pct}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: spacing2,
    marginVertical: spacing3,
  },

  // --- 投票 UI ---
  voteContainer: {
    gap: spacing2,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    minHeight: 44,
    gap: spacing2,
    backgroundColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: colorActionPrimary,
    backgroundColor: colorSurfaceMuted,
  },
  optionButtonPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colorBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCircleSelected: {
    borderColor: colorActionPrimary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colorActionPrimary,
  },
  optionButtonText: {
    ...textSm,
    color: colorTextPrimary,
    flex: 1,
    flexShrink: 1,
  },
  optionButtonTextSelected: {
    color: colorActionPrimary,
  },
  voteButton: {
    backgroundColor: colorActionPrimary,
    borderRadius: radiusSm,
    paddingVertical: spacing2,
    paddingHorizontal: spacing4,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing1,
  },
  voteButtonDisabled: {
    opacity: 0.4,
  },
  voteButtonPressed: {
    opacity: 0.8,
  },
  voteButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },

  // --- 結果 UI ---
  resultContainer: {
    gap: spacing2,
  },
  resultRow: {
    position: 'relative',
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusMd,
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  resultRowOwn: {
    borderColor: colorSuccess,
  },
  resultBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: colorSuccessBg,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    gap: spacing2,
  },
  resultText: {
    ...textSm,
    color: colorTextPrimary,
    flex: 1,
    flexShrink: 1,
  },
  resultTextOwn: {
    fontWeight: '600',
  },
  resultPct: {
    ...textSm,
    color: colorTextSecondary,
    flexShrink: 0,
  },
  resultPctOwn: {
    color: colorSuccess,
    fontWeight: '600',
  },

  // --- エラー ---
  errorBanner: {
    backgroundColor: colorErrorBg,
    borderRadius: radiusSm,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
  },
  errorText: {
    ...textXs,
    color: colorError,
  },

  // --- フッター ---
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing1,
  },
  footerText: {
    ...textXs,
    color: colorTextSecondary,
  },
  footerDot: {
    ...textXs,
    color: colorTextSecondary,
    marginHorizontal: spacing2,
  },
});
