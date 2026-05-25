import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../constants/theme';

const ASPECT_RATIOS = [4 / 5, 1, 16 / 9, 3 / 4];

function pickAspectRatio(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return ASPECT_RATIOS[Math.abs(hash) % ASPECT_RATIOS.length];
}

const categoryBadgeColors: Record<string, { bg: string; text: string }> = {
  '美食': { bg: 'rgba(171,53,0,0.1)', text: colors.primary },
  '购物': { bg: 'rgba(81,163,201,0.1)', text: colors.tertiary },
  '旅行': { bg: 'rgba(137,248,122,0.1)', text: colors.secondary },
};

function badgeColor(category: string) {
  return categoryBadgeColors[category] ?? { bg: 'rgba(171,53,0,0.1)', text: colors.primary };
}

const TAG_COLORS = [
  { bg: 'rgba(171,53,0,0.1)', text: colors.primary },
  { bg: 'rgba(137,248,122,0.2)', text: colors.secondary },
  { bg: 'rgba(81,163,201,0.15)', text: colors.tertiary },
];

interface Props {
  id: string;
  imagePath: string;
  summary: string;
  category: string;
  tags: string;
  createdAt: string;
  onPress: () => void;
  importanceScore?: number;
}

export default function ScreenshotCard({ id, imagePath, summary, category, tags: tagsJson, createdAt, onPress, importanceScore }: Props) {
  const aspectRatio = pickAspectRatio(id);
  const badge = badgeColor(category);
  const [imageError, setImageError] = useState(false);
  const tags: string[] = (() => {
    try { return JSON.parse(tagsJson); } catch { return []; }
  })();
  const displayTags = tags.slice(0, 3);

  const renderScoreBadge = () => {
    if (importanceScore === undefined || importanceScore < 60) return null;

    if (importanceScore >= 80) {
      return (
        <View style={styles.scoreBadgeGold}>
          <Text style={styles.scoreEmoji}>🔥</Text>
          <Text style={styles.scoreValue}>{importanceScore}</Text>
        </View>
      );
    } else {
      return (
        <View style={styles.scoreBadgeOrange}>
          <Text style={styles.scoreEmoji}>⭐</Text>
          <Text style={styles.scoreValue}>{importanceScore}</Text>
        </View>
      );
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.wrapper}>
      {/* 外层：只负责阴影 */}
      <View style={styles.cardShadow}>
        {/* 内层：负责背景、圆角、裁剪 */}
        <View style={styles.cardClip}>
          <View style={[styles.imageWrapper, { aspectRatio }]}>
            {imageError ? (
              <View style={styles.imageError}>
                <Ionicons name="image-outline" size={32} color={colors.outlineVariant} />
              </View>
            ) : (
              <Image
                source={{ uri: imagePath }}
                style={styles.image}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            )}
            <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.categoryLabel, { color: badge.text }]}>{category}</Text>
            </View>
            {renderScoreBadge()}
          </View>
          <View style={styles.contentArea}>
            <Text style={styles.summary} numberOfLines={2}>{summary}</Text>
            {displayTags.length > 0 && (
              <View style={styles.tagsRow}>
                {displayTags.map((tag, i) => {
                  const tc = TAG_COLORS[i % TAG_COLORS.length];
                  return (
                    <View key={i} style={[styles.miniTag, { backgroundColor: tc.bg }]}>
                      <Text style={[styles.miniTagText, { color: tc.text }]}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            <Text style={styles.date}>{formatDate(createdAt)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return '未知日期';
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  } catch {
    return '未知日期';
  }
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  cardShadow: {
    borderRadius: borderRadius.xl,
    ...shadows.card,
  },
  cardClip: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  contentArea: {
    padding: 12,
    gap: 8,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceContainerHigh,
  },
  imageError: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  summary: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  miniTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  scoreBadgeGold: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  scoreBadgeOrange: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  scoreEmoji: {
    fontSize: 12,
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
