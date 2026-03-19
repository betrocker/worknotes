import Ionicons from '@expo/vector-icons/Ionicons';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { parseDateInput } from '@/lib/date';
import { deleteJobImage, listJobImages, type JobImageKind, type JobImageRow, uploadJobImage } from '@/lib/job-images';
import { deleteJob, getJobById, type JobDetail } from '@/lib/jobs';
import { listExpenses, listPayments, type ExpenseRow, type PaymentRow } from '@/lib/job-finance';
import {
  cancelJobReminder,
  clearJobReminderPreference,
  getJobReminderPreference,
  type JobReminderOption,
} from '@/lib/notifications';
import { useAuth } from '@/providers/AuthProvider';

export default function JobDetailScreen() {
  const IMAGE_PREVIEW_LIMIT = 6;
  const GRID_GAP = 8;

  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const thumbSize = Math.floor((screenWidth - 48 - 32 - GRID_GAP * 2) / 3);

  const userId = session?.user?.id ?? null;
  const id = typeof params.id === 'string' ? params.id : null;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [images, setImages] = useState<JobImageRow[]>([]);
  const [pendingImages, setPendingImages] = useState<
    Array<{ uri: string; kind: JobImageKind; key: string }>
  >([]);
  const [reminderType, setReminderType] = useState<JobReminderOption>('same_day');
  const [uploadProgress, setUploadProgress] = useState<{
    kind: JobImageKind;
    done: number;
    total: number;
  } | null>(null);
  const [previewKind, setPreviewKind] = useState<JobImageKind | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [androidZoom, setAndroidZoom] = useState(1);
  const [selectedImageKind, setSelectedImageKind] = useState<JobImageKind | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [expandedImageSections, setExpandedImageSections] = useState<Record<JobImageKind, boolean>>({
    before: false,
    after: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    [locale]
  );
  const imageDateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale]
  );

  const load = useCallback(async () => {
    if (!userId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getJobById(userId, id);
      setJob(data);
      setReminderType(await getJobReminderPreference(id));
      const [paymentRows, expenseRows, imageRows] = await Promise.all([
        listPayments(id),
        listExpenses(id),
        listJobImages(id),
      ]);
      setPayments(paymentRows);
      setExpenses(expenseRows);
      setImages(imageRows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onBack = () => {
    router.replace({ pathname: '/(tabs)/poslovi' as any });
  };

  const onEdit = () => {
    if (!id) return;
    router.push({ pathname: '/(tabs)/posao/[id]/edit' as any, params: { id } });
  };

  const onDelete = () => {
    if (!userId || !id) return;
    Alert.alert(t('jobs.deleteConfirmTitle'), t('jobs.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelJobReminder(id);
            await clearJobReminderPreference(id);
            await deleteJob(userId, id);
            router.replace({ pathname: '/(tabs)/poslovi' as any });
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return t('jobs.unscheduled');
      const parsed = parseDateInput(value);
      if (!parsed) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter, t]
  );

  const formatCompletedDate = useCallback(
    (value: string | null) => {
      if (!value) return null;
      const parsed = parseDateInput(value);
      if (!parsed) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter]
  );

  const formatStatus = useCallback(
    (value: string | null) => {
      if (!value) return t('jobs.statusUnknown');
      if (value === 'scheduled') return t('jobs.statuses.scheduled');
      if (value === 'in_progress') return t('jobs.statuses.inProgress');
      if (value === 'done') return t('jobs.statuses.done');
      return value.replace(/_/g, ' ');
    },
    [t]
  );

  const formatReminder = useCallback(
    (value: JobReminderOption) => {
      if (value === 'none') return t('jobs.reminders.none');
      if (value === 'day_before') return t('jobs.reminders.dayBefore');
      return t('jobs.reminders.sameDay');
    },
    [t]
  );

  const formatPrice = useCallback(
    (value: number | null) => {
      if (value == null) return t('jobs.priceUnknown');
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(value);
    },
    [locale, t]
  );

  const formatListDate = useCallback(
    (value: string | null) => {
      if (!value) return null;
      const parsed = parseDateInput(value);
      if (!parsed) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter]
  );

  const formatImageDateTime = useCallback(
    (value: string | null) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return imageDateTimeFormatter.format(parsed);
    },
    [imageDateTimeFormatter]
  );

  const totalPaid = useMemo(
    () => payments.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    [payments]
  );
  const totalExpense = useMemo(
    () => expenses.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    [expenses]
  );
  const profit = totalPaid - totalExpense;
  const tipAmount = useMemo(() => {
    if (!job?.price) return 0;
    return Math.max(totalPaid - job.price, 0);
  }, [job?.price, totalPaid]);
  const outstanding = useMemo(() => {
    if (!job?.price) return null;
    return Math.max(job.price - totalPaid, 0);
  }, [job?.price, totalPaid]);
  const beforeImages = useMemo(
    () => images.filter((item) => (item.kind ?? 'before') === 'before'),
    [images]
  );
  const afterImages = useMemo(
    () => images.filter((item) => item.kind === 'after'),
    [images]
  );
  const pendingBeforeImages = useMemo(
    () => pendingImages.filter((item) => item.kind === 'before'),
    [pendingImages]
  );
  const pendingAfterImages = useMemo(
    () => pendingImages.filter((item) => item.kind === 'after'),
    [pendingImages]
  );
  const previewImages = useMemo(
    () => (previewKind === 'after' ? afterImages : previewKind === 'before' ? beforeImages : []),
    [afterImages, beforeImages, previewKind]
  );
  const previewImage = previewImages[previewIndex] ?? null;
  const previewTopInset = insets.top + (Platform.OS === 'android'
    ? previewImage?.created_at
      ? 134
      : 106
    : previewImage?.created_at
      ? 96
      : 68);
  const previewBottomInset = insets.bottom + 40;
  const previewContentHeight = Math.max(screenHeight - previewTopInset - previewBottomInset, 220);

  const phone = job?.client?.phone ?? null;
  const phoneDigits = phone ? phone.replace(/[^\d+]/g, '') : null;

  const [customMessage, setCustomMessage] = useState('');

  const openUrl = useCallback(
    async (url: string) => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
          setError(t('jobs.actionNotSupported'));
          return;
        }
        await Linking.openURL(url);
      } catch {
        setError(t('jobs.actionFailed'));
      }
    },
    [t]
  );

  const onCall = useCallback(() => {
    if (!phoneDigits) return;
    void openUrl(`tel:${phoneDigits}`);
  }, [openUrl, phoneDigits]);

  const onSms = useCallback(() => {
      if (!phoneDigits) return;
      const message = customMessage.trim();
      if (!message) return;
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const url = `sms:${phoneDigits}${separator}body=${encodeURIComponent(message)}`;
      void openUrl(url);
    }, [customMessage, openUrl, phoneDigits]);

  const onViber = useCallback(() => {
      if (!phoneDigits) return;
      const message = customMessage.trim();
      if (!message) return;
      const url = `viber://chat?number=${encodeURIComponent(phoneDigits)}&text=${encodeURIComponent(message)}`;
      void openUrl(url);
    }, [customMessage, openUrl, phoneDigits]);

  const onPickImages = useCallback(
    (kind: JobImageKind, source: 'camera' | 'library') => {
      if (!userId || !id) return;
      const run = async () => {
        try {
          if (source === 'camera') {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              setError(t('jobs.imagePermissions'));
              return;
            }
          } else {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              setError(t('jobs.imagePermissions'));
              return;
            }
          }

          setUploadProgress({ kind, done: 0, total: 0 });
          setError(null);

          const result =
            source === 'camera'
              ? await ImagePicker.launchCameraAsync({
                  mediaTypes: ['images'],
                  quality: 0.8,
                })
              : await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  quality: 0.8,
                  allowsMultipleSelection: true,
                  selectionLimit: 10,
                });

          if (result.canceled) return;

          const uploaded: JobImageRow[] = [];
          let failedCount = 0;
          const pending = result.assets.map((asset, index) => ({
            uri: asset.uri,
            kind,
            key: `${kind}-${Date.now()}-${index}`,
          }));
          setPendingImages((prev) => [...prev, ...pending]);
          setUploadProgress({ kind, done: 0, total: result.assets.length });
          for (let index = 0; index < result.assets.length; index += 1) {
            const asset = result.assets[index];
            try {
              const item = await uploadJobImage({
                userId,
                jobId: id,
                uri: asset.uri,
                kind,
              });
              uploaded.push(item);
            } catch {
              failedCount += 1;
            } finally {
              setPendingImages((prev) => prev.filter((pendingItem) => pendingItem.key !== pending[index]?.key));
              setUploadProgress({ kind, done: index + 1, total: result.assets.length });
            }
          }

          if (uploaded.length > 0) {
            setImages((prev) => [...prev, ...uploaded].sort((a, b) => {
              const aTime = new Date(a.created_at ?? 0).getTime();
              const bTime = new Date(b.created_at ?? 0).getTime();
              return aTime - bTime;
            }));
          }
          if (failedCount > 0) {
            setError(
              t('jobs.uploadPartialError', {
                success: uploaded.length,
                failed: failedCount,
              })
            );
          }
        } catch (e: unknown) {
          setPendingImages((prev) => prev.filter((item) => item.kind !== kind));
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setUploadProgress(null);
        }
      };

      void run();
    },
    [id, t, userId]
  );

  const onOpenAddPhoto = useCallback(
    (kind: JobImageKind) => {
      Alert.alert(t('jobs.chooseSourceTitle'), t('jobs.chooseSourceMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('jobs.photoGallery'), onPress: () => onPickImages(kind, 'library') },
        { text: t('jobs.photoCamera'), onPress: () => onPickImages(kind, 'camera') },
      ]);
    },
    [onPickImages, t]
  );

  const onDeleteImage = useCallback(() => {
    if (!previewImage) return;
      Alert.alert(t('jobs.imageDeleteTitle'), t('jobs.imageDeleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.imageDeleteAction'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteJobImage(previewImage.id, previewImage.storage_path);
            const nextImages = images.filter((item) => item.id !== previewImage.id);
            const nextPreviewImages = nextImages.filter((item) =>
              previewKind === 'after' ? item.kind === 'after' : (item.kind ?? 'before') === 'before'
            );
            setImages(nextImages);
            if (nextPreviewImages.length === 0) {
              setPreviewKind(null);
              setPreviewIndex(0);
            } else {
              setPreviewIndex((current) => Math.min(current, nextPreviewImages.length - 1));
            }
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }, [images, previewImage, previewKind, t]);

  const onOpenPreview = useCallback((kind: JobImageKind, index: number) => {
    setPreviewKind(kind);
    setPreviewIndex(index);
  }, []);

  const clearImageSelection = useCallback(() => {
    setSelectedImageKind(null);
    setSelectedImageIds([]);
  }, []);

  const toggleImageSelection = useCallback((kind: JobImageKind, id: string) => {
    if (selectedImageKind && selectedImageKind !== kind) {
      setSelectedImageKind(kind);
      setSelectedImageIds([id]);
      return;
    }
    setSelectedImageKind(kind);
    setSelectedImageIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((item) => item !== id);
        if (next.length === 0) {
          setSelectedImageKind(null);
        }
        return next;
      }
      return [...prev, id];
    });
  }, [selectedImageKind]);

  const onClosePreview = useCallback(() => {
    setPreviewKind(null);
    setPreviewIndex(0);
    setAndroidZoom(1);
  }, []);

  const downloadImageToCache = useCallback(async (item: JobImageRow) => {
    if (!item.image_url) return null;
    const extension = item.image_url.split('?')[0]?.split('.').pop()?.toLowerCase() || 'jpg';
    const localFile = new File(Paths.cache, `job-image-${item.id}.${extension}`);
    return await File.downloadFileAsync(item.image_url, localFile);
  }, []);

  const onShareImageItem = useCallback(async (item: JobImageRow) => {
    if (!item.image_url) return;
    try {
      const downloadedFile = await downloadImageToCache(item);
      if (!downloadedFile) return;
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        await Share.share({
          url: item.image_url,
          message: item.image_url,
        });
        return;
      }
      await Sharing.shareAsync(downloadedFile.uri, {
        mimeType: `image/${downloadedFile.extension === '.png' ? 'png' : 'jpeg'}`,
        dialogTitle: t('jobs.imageShareAction'),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [downloadImageToCache, t]);

  const onShareImage = useCallback(async () => {
    if (!previewImage) return;
    await onShareImageItem(previewImage);
  }, [onShareImageItem, previewImage]);

  const onSaveImageItem = useCallback(async (item: JobImageRow) => {
    if (!item.image_url) return;
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        setError(t('jobs.imageSavePermission'));
        return;
      }
      const downloadedFile = await downloadImageToCache(item);
      if (!downloadedFile) return;
      await MediaLibrary.createAssetAsync(downloadedFile.uri);
      Alert.alert(t('jobs.imageSavedTitle'), t('jobs.imageSaved'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [downloadImageToCache, t]);

  const onShareImageSection = useCallback(
    async (kind: JobImageKind, items: JobImageRow[]) => {
      const urls = items.map((item) => item.image_url).filter(Boolean) as string[];
      if (urls.length === 0) return;
      const sectionLabel = kind === 'before' ? t('jobs.imageBefore') : t('jobs.imageAfter');
      try {
        await Share.share({
          message: [sectionLabel, ...urls].join('\n'),
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [t]
  );

  const onShareSelectedImages = useCallback(
    async (kind: JobImageKind, items: JobImageRow[]) => {
      const selectedItems = items.filter((item) => selectedImageIds.includes(item.id));
      if (selectedItems.length === 0) return;
      try {
        if (selectedItems.length === 1) {
          await onShareImageItem(selectedItems[0]);
        } else {
          const urls = selectedItems.map((item) => item.image_url).filter(Boolean) as string[];
          if (urls.length === 0) return;
          const sectionLabel = kind === 'before' ? t('jobs.imageBefore') : t('jobs.imageAfter');
          await Share.share({
            message: [sectionLabel, ...urls].join('\n'),
          });
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [onShareImageItem, selectedImageIds, t]
  );

  const onDeleteImageItem = useCallback(
    (item: JobImageRow) => {
      Alert.alert(t('jobs.imageDeleteTitle'), t('jobs.imageDeleteMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('jobs.imageDeleteAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJobImage(item.id, item.storage_path);
              setImages((prev) => prev.filter((row) => row.id !== item.id));
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : String(e));
            }
          },
        },
      ]);
    },
    [t]
  );

  const onDeleteSelectedImages = useCallback(
    (items: JobImageRow[]) => {
      const selectedItems = items.filter((item) => selectedImageIds.includes(item.id));
      if (selectedItems.length === 0) return;
      Alert.alert(t('jobs.imageDeleteSelectedTitle'), t('jobs.imageDeleteSelectedMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('jobs.imageDeleteSelectedAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                selectedItems.map((item) => deleteJobImage(item.id, item.storage_path))
              );
              setImages((prev) => prev.filter((item) => !selectedImageIds.includes(item.id)));
              clearImageSelection();
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : String(e));
            }
          },
        },
      ]);
    },
    [clearImageSelection, selectedImageIds, t]
  );

  const zoomInAndroid = useCallback(() => {
    setAndroidZoom((value) => Math.min(3, Number((value + 0.5).toFixed(2))));
  }, []);

  const zoomOutAndroid = useCallback(() => {
    setAndroidZoom((value) => Math.max(1, Number((value - 0.5).toFixed(2))));
  }, []);

  const resetAndroidZoom = useCallback(() => {
    setAndroidZoom(1);
  }, []);

  const toggleImageSection = useCallback((kind: JobImageKind) => {
    setExpandedImageSections((prev) => ({
      ...prev,
      [kind]: !prev[kind],
    }));
  }, []);

  const renderImageSection = useCallback(
    (
      kind: JobImageKind,
      items: JobImageRow[],
      pending: Array<{ uri: string; kind: JobImageKind; key: string }>
    ) => {
      const expanded = expandedImageSections[kind];
      const selectionMode = selectedImageKind === kind && selectedImageIds.length > 0;
      const selectionCount = selectionMode
        ? items.filter((item) => selectedImageIds.includes(item.id)).length
        : 0;
      const allItems = [...pending, ...items];
      const hasOverflow = allItems.length > IMAGE_PREVIEW_LIMIT;
      const visibleItems = expanded ? items : items.slice(0, IMAGE_PREVIEW_LIMIT);
      const remainingSlots = Math.max(IMAGE_PREVIEW_LIMIT - visibleItems.length, 0);
      const visiblePending = expanded ? pending : pending.slice(0, remainingSlots);

      return (
      <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
        <View className="flex-row items-center justify-between">
          <Text className="text-[18px] font-extrabold text-[#1C2745] dark:text-white">
            {selectionMode
              ? t('jobs.imageSelectedCount', { count: selectionCount })
              : `${kind === 'before' ? t('jobs.imageBefore') : t('jobs.imageAfter')} (${allItems.length})`}
          </Text>
          <View className="flex-row items-center">
            {selectionMode ? (
              <>
                <Pressable
                  onPress={() => {
                    void onShareSelectedImages(kind, items);
                  }}
                  className="mr-2 h-10 w-10 items-center justify-center rounded-3xl bg-black/5 dark:bg-white/10">
                  <Ionicons name="share-social-outline" size={18} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => onDeleteSelectedImages(items)}
                  className="mr-2 h-10 w-10 items-center justify-center rounded-3xl bg-[#FDEBEE] dark:bg-[#3A1F24]">
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                </Pressable>
                <Pressable
                  onPress={clearImageSelection}
                  className="h-10 w-10 items-center justify-center rounded-3xl bg-black/5 dark:bg-white/10">
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </>
            ) : (
              <>
                {hasOverflow ? (
                  <Pressable
                    onPress={() => toggleImageSection(kind)}
                    className="mr-2 rounded-3xl bg-black/5 px-3 py-2 dark:bg-white/10">
                    <Text className="text-xs font-semibold text-black/70 dark:text-white/80">
                      {expanded ? t('jobs.showLessPhotos') : t('jobs.showAllPhotos')}
                    </Text>
                  </Pressable>
                ) : null}
                {items.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      void onShareImageSection(kind, items);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('jobs.imageShareAllAction')}
                    className="mr-2 h-10 w-10 items-center justify-center rounded-3xl bg-black/5 dark:bg-white/10">
                    <Ionicons name="share-social-outline" size={18} color={colors.text} />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => onOpenAddPhoto(kind)}
                  disabled={uploadProgress?.kind === kind}
                  accessibilityRole="button"
                  accessibilityLabel={t('jobs.addPhoto')}
                  className="h-10 w-10 items-center justify-center rounded-3xl bg-[#E8F0FF] disabled:opacity-60 dark:bg-[#1E2A44]">
                  {uploadProgress?.kind === kind ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Ionicons name="add" size={20} color={colors.text} />
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>

        {uploadProgress?.kind === kind ? (
          <Text className="mt-2 text-xs font-medium text-black/55 dark:text-white/65">
            {t('jobs.uploadingPhotos', {
              done: uploadProgress.done,
              total: uploadProgress.total,
            })}
          </Text>
        ) : null}

        {items.length === 0 && pending.length === 0 ? (
          <Text className="mt-3 text-sm text-black/60 dark:text-white/70">
            {kind === 'before' ? t('jobs.noBeforeImages') : t('jobs.noAfterImages')}
          </Text>
        ) : (
          <View className="mt-3 flex-row flex-wrap">
            {visibleItems.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (selectionMode) {
                    toggleImageSelection(kind, item.id);
                  } else {
                    onOpenPreview(kind, index);
                  }
                }}
                onLongPress={() => {
                  if (selectionMode) {
                    toggleImageSelection(kind, item.id);
                  } else {
                    toggleImageSelection(kind, item.id);
                  }
                }}
                style={{ marginRight: index % 3 === 2 ? 0 : 8, marginBottom: 8 }}>
                <View>
                  <Image
                    source={{ uri: item.image_url ?? undefined }}
                    style={{ width: thumbSize, height: thumbSize, borderRadius: 18, backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#E9EEF8' }}
                  />
                  {selectionMode ? (
                    <View
                      className={`absolute inset-0 rounded-[18px] ${selectedImageIds.includes(item.id) ? 'bg-[#1A4FE0]/28' : 'bg-black/12'}`}
                    />
                  ) : null}
                  {selectionMode ? (
                    <View className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full bg-black/55">
                      <Ionicons
                        name={selectedImageIds.includes(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color="white"
                      />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))}
            {visiblePending.map((item, index) => (
              <View
                key={item.key}
                style={{ marginRight: (index + visibleItems.length) % 3 === 2 ? 0 : 8, marginBottom: 8 }}
                className="overflow-hidden rounded-2xl">
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: thumbSize, height: thumbSize, backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#E9EEF8', opacity: 0.55 }}
                />
                <View className="absolute inset-0 items-center justify-center bg-black/20">
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
    },
    [
      colorScheme,
      colors.text,
      expandedImageSections,
      clearImageSelection,
      thumbSize,
      onDeleteSelectedImages,
      onOpenAddPhoto,
      onShareImageSection,
      onShareSelectedImages,
      onOpenPreview,
      selectedImageIds,
      selectedImageKind,
      t,
      toggleImageSelection,
      toggleImageSection,
      uploadProgress,
    ]
  );

  return (
    <>
      <ScrollView
        stickyHeaderIndices={[0]}
        className="flex-1 bg-[#F2F2F7] dark:bg-black"
        contentContainerClassName="pb-32">
        <View style={{ position: 'relative', zIndex: 20 }}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={35}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.28)' : 'rgba(255,255,255,0.28)' },
            ]}
          />
        )}

        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.28)' : 'rgba(255,255,255,0.28)' },
          ]}
        />

        <View className="px-6 pb-6" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.delete')}
              onPress={onDelete}
              className="mr-3 h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="trash" size={18} color="#FF3B30" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.edit')}
              onPress={onEdit}
              className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="create-outline" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

          <Text className="mt-4 font-semibold text-[30px] leading-[36px] tracking-tight text-black dark:text-white">
            {job?.title || t('jobs.untitled')}
          </Text>
          <View className="mt-1 flex-row items-center">
            <Ionicons name="person-outline" size={16} color={colors.secondaryText} />
            <Text className="ml-2 text-base text-black/60 dark:text-white/70">
              {job?.client?.name || t('jobs.noClient')}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-6 pt-4">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : job ? (
            <>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.dateLabel')}</Text>
                <Text className="text-base text-black dark:text-white">{formatDate(job.scheduled_date)}</Text>
              </View>
              <View className="my-4 h-px bg-black/10 dark:bg-white/10" />

              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.statusLabel')}</Text>
                <View className="flex-row items-center">
                  <Text className="text-base text-black dark:text-white">{formatStatus(job.status)}</Text>
                  {job.completed_at ? (
                    <>
                      <Text className="mx-2 text-sm text-black/30 dark:text-white/30">•</Text>
                      <Text className="text-base text-black dark:text-white">
                        {formatCompletedDate(job.completed_at)}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
              <View className="my-4 h-px bg-black/10 dark:bg-white/10" />

              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">
                  {t('jobs.reminderLabel')}
                </Text>
                <Text className="text-base text-black dark:text-white">{formatReminder(reminderType)}</Text>
              </View>
              <View className="my-4 h-px bg-black/10 dark:bg-white/10" />

              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.priceLabel')}</Text>
                <Text className="text-base text-black dark:text-white">
                {formatPrice(job.price)}
                </Text>
              </View>

              {job.description ? (
                <>
                  <View className="my-4 h-px bg-black/10 dark:bg-white/10" />
                  <Text className="text-sm font-medium text-black/60 dark:text-white/70">
                    {t('jobs.descriptionLabel')}
                  </Text>
                  <Text className="mt-2 text-base text-black/80 dark:text-white/80">{job.description}</Text>
                </>
              ) : null}

            </>
          ) : (
            <Text className="text-base text-black/60 dark:text-white/70">{t('jobs.notFound')}</Text>
          )}

          {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          <View className="flex-row items-center justify-between">
            <Text className="text-[18px] font-extrabold text-[#1C2745] dark:text-white">
              {t('jobs.financials')}
            </Text>
            <View className="flex-row items-center">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/posao/[id]/payment/new' as any,
                    params: { id, returnTo: 'job' },
                  })
                }
                className="mr-2 rounded-3xl bg-[#E8F0FF] px-3 py-2 dark:bg-[#1E2A44]">
                <Text className="text-sm font-semibold text-black dark:text-white">{t('jobs.addPayment')}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/(tabs)/posao/[id]/expense/new' as any, params: { id } })}
                className="rounded-3xl bg-[#FDEBEE] px-3 py-2 dark:bg-[#3A1F24]">
                <Text className="text-sm font-semibold text-black dark:text-white">{t('jobs.addExpense')}</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.totalPaid')}</Text>
              <Text className="text-base text-black dark:text-white">
                {formatPrice(totalPaid)}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.totalExpenses')}</Text>
              <Text className="text-base text-black dark:text-white">
                {formatPrice(totalExpense)}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.profit')}</Text>
              <Text className="text-base font-semibold text-black dark:text-white">
                {formatPrice(profit)}
              </Text>
            </View>
            {tipAmount > 0 ? (
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.tip')}</Text>
                <Text className="text-base font-semibold text-[#2F8C57] dark:text-[#7AD69C]">
                  {formatPrice(tipAmount)}
                </Text>
              </View>
            ) : null}
            {outstanding != null ? (
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.outstanding')}</Text>
                <Text className="text-base text-black dark:text-white">
                  {formatPrice(outstanding)}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="my-4 h-px bg-black/10 dark:bg-white/10" />
          <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.payments')}</Text>
          {payments.length === 0 ? (
            <Text className="mt-2 text-sm text-black/60 dark:text-white/70">{t('jobs.noPayments')}</Text>
          ) : (
            payments.map((p) => (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/posao/[id]/payment/[paymentId]/edit' as any,
                    params: { id, paymentId: p.id, returnTo: 'job' },
                  })
                }
                className="mt-2 flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-sm text-black/80 dark:text-white/80" numberOfLines={1}>
                    {p.note || t('jobs.payment')}
                  </Text>
                  {p.payment_date ? (
                    <Text className="text-xs text-black/50 dark:text-white/60">{formatListDate(p.payment_date)}</Text>
                  ) : null}
                </View>
                <Text className="text-sm text-black/70 dark:text-white/80">
                  {formatPrice(p.amount ?? 0)}
                </Text>
              </Pressable>
            ))
          )}

          <View className="my-4 h-px bg-black/10 dark:bg-white/10" />
          <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.expenses')}</Text>
          {expenses.length === 0 ? (
            <Text className="mt-2 text-sm text-black/60 dark:text-white/70">{t('jobs.noExpenses')}</Text>
          ) : (
            expenses.map((e) => (
              <Pressable
                key={e.id}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/posao/[id]/expense/[expenseId]/edit' as any,
                    params: { id, expenseId: e.id },
                  })
                }
                className="mt-2 flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-sm text-black/80 dark:text-white/80" numberOfLines={1}>
                    {e.title || t('jobs.expense')}
                  </Text>
                  {e.created_at ? (
                    <Text className="text-xs text-black/50 dark:text-white/60">{formatListDate(e.created_at)}</Text>
                  ) : null}
                </View>
                <Text className="text-sm text-black/70 dark:text-white/80">
                  {formatPrice(e.amount ?? 0)}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        {renderImageSection('before', beforeImages, pendingBeforeImages)}
        {renderImageSection('after', afterImages, pendingAfterImages)}

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          <Text className="text-[18px] font-extrabold text-[#1C2745] dark:text-white">{t('jobs.quickActions')}</Text>
          {phoneDigits ? (
            <View className="mt-3">
              <Text className="text-sm font-medium text-black/60 dark:text-white/70">
                {t('jobs.customMessage')}
              </Text>
              <View className="mt-2">
                <TextInput
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  placeholder={t('jobs.customMessagePlaceholder')}
                  placeholderTextColor={colors.secondaryText}
                  multiline
                  className="min-h-[80px] rounded-3xl bg-black/5 px-4 py-3 text-base text-black dark:bg-white/10 dark:text-white"
                />
              </View>

              <View className="mt-3 flex-row flex-wrap justify-center">
                <Pressable
                  onPress={onCall}
                  className="mr-2 mt-2 flex-row items-center rounded-3xl bg-black/5 px-4 py-2 dark:bg-white/10">
                  <Ionicons name="call-outline" size={16} color={colors.text} />
                  <Text className="ml-2 text-sm text-black dark:text-white">{t('jobs.call')}</Text>
                </Pressable>

                <Pressable
                  onPress={onSms}
                  className="mr-2 mt-2 flex-row items-center rounded-3xl bg-[#E8F0FF] px-4 py-2 dark:bg-[#1E2A44]">
                  <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
                  <Text className="ml-2 text-sm text-black dark:text-white">{t('jobs.sms')}</Text>
                </Pressable>

                <Pressable
                  onPress={onViber}
                  className="mr-2 mt-2 flex-row items-center rounded-3xl bg-[#E8F7EF] px-4 py-2 dark:bg-[#203326]">
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
                  <Text className="ml-2 text-sm text-black dark:text-white">{t('jobs.viber')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text className="mt-2 text-sm text-black/60 dark:text-white/70">{t('jobs.noPhone')}</Text>
          )}
        </View>
      </View>
    </ScrollView>

      <Modal transparent visible={Boolean(previewKind && previewImages.length)} animationType="fade" onRequestClose={onClosePreview}>
        <View className="flex-1 bg-black">
          <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-6" style={{ paddingTop: insets.top + 12 }}>
            <Pressable
              onPress={onClosePreview}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/12">
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
            <View className="flex-row items-center">
              {previewImages.length > 1 ? (
                <Text className="mr-3 text-sm font-semibold text-white/80">
                  {previewIndex + 1} / {previewImages.length}
                </Text>
              ) : null}
              <Pressable
                onPress={onShareImage}
                disabled={!previewImage?.image_url}
                className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white/12 disabled:opacity-40">
                <Ionicons name="share-outline" size={18} color="white" />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (previewImage) {
                    void onSaveImageItem(previewImage);
                  }
                }}
                disabled={!previewImage?.image_url}
                className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white/12 disabled:opacity-40">
                <Ionicons name="download-outline" size={18} color="white" />
              </Pressable>
              <Pressable
                onPress={onDeleteImage}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/12">
                <Ionicons name="trash-outline" size={20} color="white" />
              </Pressable>
            </View>
          </View>

          {previewImage?.created_at ? (
            <View
              pointerEvents="none"
              className="absolute left-0 right-0 z-10 items-center"
              style={{ top: insets.top + 58 }}>
              <View className="rounded-full bg-black/40 px-4 py-2 border border-white/10">
                <Text className="text-sm font-bold text-white">
                  {formatImageDateTime(previewImage.created_at)}
                </Text>
              </View>
            </View>
          ) : null}

          {Platform.OS === 'android' ? (
            <View
              className="absolute left-0 right-0 z-10 flex-row items-center justify-center"
              style={{ top: insets.top + (previewImage?.created_at ? 94 : 64) }}>
              <View className="flex-row items-center rounded-full bg-white/12 px-2 py-1">
                <Pressable
                  onPress={zoomOutAndroid}
                  className="h-9 w-9 items-center justify-center rounded-full">
                  <Ionicons name="remove" size={18} color="white" />
                </Pressable>
                <Text className="mx-2 min-w-[44px] text-center text-sm font-semibold text-white/90">
                  {androidZoom.toFixed(1)}x
                </Text>
                <Pressable
                  onPress={zoomInAndroid}
                  className="h-9 w-9 items-center justify-center rounded-full">
                  <Ionicons name="add" size={18} color="white" />
                </Pressable>
                <Pressable
                  onPress={resetAndroidZoom}
                  className="ml-1 h-9 items-center justify-center rounded-full px-3">
                  <Text className="text-xs font-semibold text-white/80">{t('jobs.imageResetZoom')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <FlatList
            key={`${previewKind ?? 'none'}-${previewImages.length}`}
            data={previewImages}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={previewIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setPreviewIndex(nextIndex);
              setAndroidZoom(1);
            }}
            renderItem={({ item, index }) => (
              Platform.OS === 'ios' ? (
                <ScrollView
                  style={{ width: screenWidth, flex: 1 }}
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: previewTopInset,
                    paddingBottom: previewBottomInset,
                    minHeight: screenHeight,
                  }}
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  bouncesZoom={false}
                  centerContent>
                  <Image
                    source={{ uri: item.image_url ?? undefined }}
                    resizeMode="contain"
                    style={{
                      width: screenWidth,
                      height: previewContentHeight,
                      maxWidth: screenWidth,
                      maxHeight: previewContentHeight,
                    }}
                  />
                </ScrollView>
              ) : (
                <View
                  style={{
                    width: screenWidth,
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: previewTopInset,
                    paddingBottom: previewBottomInset,
                  }}>
                  <Animated.Image
                    source={{ uri: item.image_url ?? undefined }}
                    resizeMode="contain"
                    style={{
                      width: screenWidth,
                      height: previewContentHeight,
                      maxWidth: screenWidth,
                      maxHeight: previewContentHeight,
                      transform: [{ scale: index === previewIndex ? androidZoom : 1 }],
                    }}
                  />
                </View>
              )
            )}
          />
        </View>
      </Modal>
    </>
  );
}
