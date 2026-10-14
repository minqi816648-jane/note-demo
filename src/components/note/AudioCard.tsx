import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useTheme } from '../../theme';
import { spacing, radius, fontSize, fontWeight } from '../../theme';
import type { Attachment } from '../../constants/theme';

interface AudioCardProps {
  attachment: Attachment;
}

/**
 * 录音附件卡片：播放/暂停 + 进度条
 */
export function AudioCard({ attachment }: AudioCardProps) {
  const { colors } = useTheme();
  const player = useAudioPlayer({ uri: attachment.file_path });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(player.currentTime || 0);
    }, 500);
    return () => clearInterval(t);
  }, [player]);

  const duration = attachment.duration ?? Math.round(player.duration ?? 0);
  const playing = player.playing;
  const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;

  const toggle = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={toggle}
      activeOpacity={0.8}
    >
      <View style={[styles.thumb, { backgroundColor: colors.primary + '1a' }]}>
        <Text style={styles.thumbIcon}>{playing ? '⏸️' : '🎙️'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {attachment.title || attachment.file_name || '语音笔记'}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {mmss(elapsed)} / {mmss(duration)}
        </Text>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  thumbIcon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  meta: {
    fontSize: fontSize.small,
    marginBottom: 4,
  },
  track: {
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});
