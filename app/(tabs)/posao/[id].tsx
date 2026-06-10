import Ionicons from '@expo/vector-icons/Ionicons';
import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Share,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollapsingMainHeader, MainScreenTitle } from '@/components/CollapsingMainHeader';
import { HeaderOverflowMenu } from '@/components/HeaderOverflowMenu';
import { JobDetailFloatingActions, type JobDetailFloatingAction } from '@/components/JobDetailFloatingActions';
import Colors from '@/constants/Colors';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useQuickFindSwipeDown } from '@/components/useQuickFindSwipeDown';
import { useColorScheme } from '@/components/useColorScheme';
import { parseDateInput } from '@/lib/date';
import { generateInvoicePdf } from '@/lib/invoice';
import { getOrCreateInvoiceForJob } from '@/lib/invoices';
import {
  createJobInvoiceItem,
  deleteJobInvoiceItem,
  listJobInvoiceItems,
  updateJobInvoiceItem,
  type JobInvoiceItemRow,
} from '@/lib/job-invoice-items';
import { deleteJobImage, listJobImages, type JobImageKind, type JobImageRow, uploadJobImage } from '@/lib/job-images';
import { archiveJob, deleteJob, getJobById, unarchiveJob, type JobDetail } from '@/lib/jobs';
import { listExpenses, listPayments, type ExpenseRow, type PaymentRow } from '@/lib/job-finance';
import {
  cancelJobReminder,
  clearJobReminderPreference,
  getJobReminderPreference,
  type JobReminderOption,
} from '@/lib/notifications';
import { getUserDisplayName } from '@/lib/user';
import { goBackOrReplace } from '@/lib/navigation';
import { useAuth } from '@/providers/AuthProvider';

type InvoiceItemSwipeRowProps = {
  item: JobInvoiceItemRow;
  index: number;
  locale: string;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
  formatPrice: (value: number | null) => string;
  unitLabel: string;
  untitledLabel: string;
  onEdit: (item: JobInvoiceItemRow) => void;
  onDelete: (item: JobInvoiceItemRow) => void;
  isSwipeOpen: boolean;
  onSwipeOpen: (itemId: string) => void;
  onSwipeClose: (itemId: string) => void;
};

type InvoiceItemInlineFormRowProps = {
  marginTop?: number;
  title: string;
  quantity: string;
  unitPrice: string;
  titlePlaceholder: string;
  quantityPlaceholder: string;
  unitPricePlaceholder: string;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
  closing: boolean;
  submitting: boolean;
  onBlurAway: () => void;
  onChangeTitle: (value: string) => void;
  onChangeQuantity: (value: string) => void;
  onChangeUnitPrice: (value: string) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  onSubmit: () => void;
};

const INVOICE_ITEM_ACTION_WIDTH = 78;
const INVOICE_ITEM_ACTION_STRETCH = 12;
const INVOICE_ITEM_ROW_GAP = 4;

function getJobImageUri(item: JobImageRow | null | undefined) {
  return item?.image_url ?? item?.local_uri ?? null;
}

function InvoiceItemInlineFormRow({
  marginTop = 0,
  title,
  quantity,
  unitPrice,
  titlePlaceholder,
  quantityPlaceholder,
  unitPricePlaceholder,
  colors,
  colorScheme,
  closing,
  submitting,
  onBlurAway,
  onChangeTitle,
  onChangeQuantity,
  onChangeUnitPrice,
  onLayout,
  onSubmit,
}: InvoiceItemInlineFormRowProps) {
  const presence = useRef(new Animated.Value(0)).current;
  const titleInputRef = useRef<TextInput>(null);
  const quantityInputRef = useRef<TextInput>(null);
  const unitPriceInputRef = useRef<TextInput>(null);
  const blurAwayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBlurAwayTimer = useCallback(() => {
    if (blurAwayTimerRef.current) {
      clearTimeout(blurAwayTimerRef.current);
      blurAwayTimerRef.current = null;
    }
  }, []);

  const handleInputFocus = useCallback(() => {
    clearBlurAwayTimer();
  }, [clearBlurAwayTimer]);

  const handleInputBlur = useCallback(() => {
    clearBlurAwayTimer();
    blurAwayTimerRef.current = setTimeout(() => {
      const anyInputFocused =
        titleInputRef.current?.isFocused() ||
        quantityInputRef.current?.isFocused() ||
        unitPriceInputRef.current?.isFocused();

      if (!anyInputFocused) {
        onBlurAway();
      }
    }, 80);
  }, [clearBlurAwayTimer, onBlurAway]);

  useEffect(() => {
    Animated.timing(presence, {
      toValue: closing ? 0 : 1,
      duration: closing ? 105 : 130,
      easing: closing ? Easing.in(Easing.quad) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [closing, presence]);

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 45);
    return () => clearTimeout(focusTimer);
  }, []);

  useEffect(() => clearBlurAwayTimer, [clearBlurAwayTimer]);

  return (
    <Animated.View
      onLayout={onLayout}
      className="flex-row items-center overflow-hidden rounded-2xl"
      style={{
        marginTop,
        backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.07)' : '#D5E5FF',
        opacity: presence,
        transform: [
          {
            translateY: presence.interpolate({
              inputRange: [0, 1],
              outputRange: [-3, 0],
            }),
          },
          {
            scale: presence.interpolate({
              inputRange: [0, 1],
              outputRange: [0.985, 1],
            }),
          },
        ],
      }}>
      <TextInput
        ref={titleInputRef}
        value={title}
        onChangeText={onChangeTitle}
        placeholder={titlePlaceholder}
        placeholderTextColor={colors.secondaryText}
        returnKeyType="next"
        submitBehavior="submit"
        editable={!submitting}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onSubmitEditing={() => quantityInputRef.current?.focus()}
        className="h-12 flex-[1.9] px-3 text-app-row text-black dark:text-white"
      />
      <View className="h-7 w-px bg-black/10 dark:bg-white/12" />
      <TextInput
        ref={quantityInputRef}
        value={quantity}
        onChangeText={onChangeQuantity}
        placeholder={quantityPlaceholder}
        placeholderTextColor={colors.secondaryText}
        keyboardType="decimal-pad"
        returnKeyType="next"
        submitBehavior="submit"
        editable={!submitting}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onSubmitEditing={() => unitPriceInputRef.current?.focus()}
        className="h-12 flex-[0.72] px-2 text-center text-app-row text-black dark:text-white"
      />
      <View className="h-7 w-px bg-black/10 dark:bg-white/12" />
      <TextInput
        ref={unitPriceInputRef}
        value={unitPrice}
        onChangeText={onChangeUnitPrice}
        placeholder={unitPricePlaceholder}
        placeholderTextColor={colors.secondaryText}
        keyboardType="decimal-pad"
        returnKeyType="done"
        submitBehavior="submit"
        editable={!submitting}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onSubmitEditing={onSubmit}
        className="h-12 flex-[1.05] px-3 text-right text-app-row text-black dark:text-white"
      />
    </Animated.View>
  );
}

function InvoiceItemSwipeRow({
  item,
  index,
  locale,
  colors,
  colorScheme,
  formatPrice,
  unitLabel,
  untitledLabel,
  onEdit,
  onDelete,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
}: InvoiceItemSwipeRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const collapse = useRef(new Animated.Value(1)).current;
  const startXRef = useRef(0);
  const openRef = useRef(false);
  const [rowHeight, setRowHeight] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const closeSwipe = useCallback((notifyParent = true) => {
    openRef.current = false;
    if (notifyParent) {
      onSwipeClose(item.id);
    }
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 150,
      mass: 0.82,
    }).start();
  }, [item.id, onSwipeClose, translateX]);

  const openSwipe = useCallback(() => {
    openRef.current = true;
    onSwipeOpen(item.id);
    Animated.spring(translateX, {
      toValue: -INVOICE_ITEM_ACTION_WIDTH,
      useNativeDriver: true,
      damping: 9,
      stiffness: 135,
      mass: 0.78,
    }).start();
  }, [item.id, onSwipeOpen, translateX]);

  useEffect(() => {
    if (!isSwipeOpen && openRef.current) {
      closeSwipe(false);
    }
  }, [closeSwipe, isSwipeOpen]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
        onPanResponderGrant: () => {
          startXRef.current = openRef.current ? -INVOICE_ITEM_ACTION_WIDTH : 0;
          if (!openRef.current) {
            onSwipeOpen(item.id);
          }
        },
        onPanResponderMove: (_, gesture) => {
          const rawNext = startXRef.current + gesture.dx;
          const maxOpen = -(INVOICE_ITEM_ACTION_WIDTH + INVOICE_ITEM_ACTION_STRETCH);
          const next =
            rawNext < -INVOICE_ITEM_ACTION_WIDTH
              ? Math.max(maxOpen, -INVOICE_ITEM_ACTION_WIDTH + (rawNext + INVOICE_ITEM_ACTION_WIDTH) * 0.32)
              : Math.max(-INVOICE_ITEM_ACTION_WIDTH, Math.min(0, rawNext));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const next = startXRef.current + gesture.dx;
          if (next < -INVOICE_ITEM_ACTION_WIDTH / 2 || gesture.vx < -0.5) {
            openSwipe();
          } else {
            closeSwipe();
          }
        },
        onPanResponderTerminate: () => closeSwipe(),
      }),
    [closeSwipe, item.id, onSwipeOpen, openSwipe, translateX]
  );

  const onDeletePress = useCallback(() => {
    if (deleting) return;
    onSwipeClose(item.id);
    setDeleting(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -INVOICE_ITEM_ACTION_WIDTH,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(collapse, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start(() => onDelete(item));
  }, [collapse, deleting, item, onDelete, onSwipeClose, translateX]);

  const actionTranslateX = translateX.interpolate({
    inputRange: [-INVOICE_ITEM_ACTION_WIDTH, 0],
    outputRange: [0, 20],
    extrapolate: 'clamp',
  });
  const actionOpacity = translateX.interpolate({
    inputRange: [-INVOICE_ITEM_ACTION_WIDTH, -28, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });
  const swipeBackgroundOpacity = translateX.interpolate({
    inputRange: [-INVOICE_ITEM_ACTION_WIDTH, -54, -34, 0],
    outputRange: [1, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const rowSwipeBackgroundOpacity = translateX.interpolate({
    inputRange: [-INVOICE_ITEM_ACTION_WIDTH, -34, 0],
    outputRange: [1, 0.36, 0],
    extrapolate: 'clamp',
  });
  const textCounterTranslateX = translateX.interpolate({
    inputRange: [-INVOICE_ITEM_ACTION_WIDTH, 0],
    outputRange: [64, 0],
    extrapolate: 'clamp',
  });
  const rowAnimatedStyle = rowHeight
    ? {
        height: collapse.interpolate({
          inputRange: [0, 1],
          outputRange: [0, rowHeight],
        }),
        opacity: collapse,
      }
    : { opacity: collapse };
  const rowSwipeBackgroundColor = colorScheme === 'dark' ? '#2A3038' : '#D5E5FF';
  const editIconColor = colorScheme === 'dark' ? '#8FADE7' : '#315FAD';
  const deleteIconColor = colorScheme === 'dark' ? '#E08A84' : '#B5413A';

  return (
    <Animated.View
      style={[
        rowAnimatedStyle,
        {
          overflow: deleting ? 'hidden' : 'visible',
          marginTop: index > 0 ? INVOICE_ITEM_ROW_GAP : 0,
        },
      ]}>
      <View
        onLayout={(event) => {
          if (!rowHeight) setRowHeight(event.nativeEvent.layout.height);
        }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderRadius: 16,
            backgroundColor: 'transparent',
            opacity: swipeBackgroundOpacity,
            overflow: 'hidden',
          }}>
          <Animated.View
            style={{
              width: INVOICE_ITEM_ACTION_WIDTH,
              flexDirection: 'row',
              justifyContent: 'flex-end',
              opacity: actionOpacity,
              transform: [{ translateX: actionTranslateX }],
            }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit"
              onPress={() => {
                onSwipeClose(item.id);
                onEdit(item);
              }}
              className="mr-1 h-12 w-9 items-center justify-center">
              <Ionicons name="create-outline" size={19} color={editIconColor} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete"
              onPress={onDeletePress}
              disabled={deleting}
              className="h-12 w-9 items-center justify-center disabled:opacity-50">
              <Ionicons name="trash-outline" size={19} color={deleteIconColor} />
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateX }],
            borderRadius: 16,
            paddingVertical: 6,
            paddingLeft: 8,
            paddingRight: 0,
          }}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              right: -8,
              bottom: 0,
              left: 0,
              borderRadius: 16,
              backgroundColor: rowSwipeBackgroundColor,
              opacity: rowSwipeBackgroundOpacity,
            }}
          />
          <View className="flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Animated.View style={{ transform: [{ translateX: textCounterTranslateX }] }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: '400', lineHeight: 21 }}>
                  {item.title || untitledLabel}
                </Text>
                <Text numberOfLines={1} className="text-app-meta-lg text-black/60 dark:text-white/70">
                  {(item.quantity ?? 0).toLocaleString(locale)} {item.unit || unitLabel} x{' '}
                  {formatPrice(item.unit_price ?? 0)}
                </Text>
              </Animated.View>
            </View>
            <Text className="self-center text-app-row text-right" style={{ color: colors.text }}>
              {formatPrice(item.total ?? 0)}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function JobDetailScreen() {
  const GRID_GAP = 8;

  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const quickFindSwipe = useQuickFindSwipeDown();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const thumbSize = Math.floor((screenWidth - 48 - 12 - GRID_GAP * 3) / 4);

  const userId = session?.user?.id ?? null;
  const id = typeof params.id === 'string' ? params.id : null;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<JobInvoiceItemRow[]>([]);
  const [images, setImages] = useState<JobImageRow[]>([]);
  const [pendingImages, setPendingImages] = useState<{ uri: string; key: string }[]>([]);
  const [reminderType, setReminderType] = useState<JobReminderOption>('same_day');
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [androidZoom, setAndroidZoom] = useState(1);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemFormClosing, setItemFormClosing] = useState(false);
  const [optimisticCreatedItemId, setOptimisticCreatedItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<JobInvoiceItemRow | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemUnitPrice, setItemUnitPrice] = useState('');
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [openInvoiceItemSwipeId, setOpenInvoiceItemSwipeId] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [, setInvoiceSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const mainScrollRef = useRef<ScrollView>(null);
  const invoiceItemsContainerYRef = useRef(0);
  const invoiceItemFormYRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }),
    [locale]
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    hasLoadedRef.current = false;
    setLoading(true);
  }, [id]);

  const imageDateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale]
  );

  const load = useCallback(async () => {
    if (!userId || !id) return;
    if (!hasLoadedRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getJobById(userId, id);
      setJob(data);
      setReminderType(await getJobReminderPreference(id));
      const [paymentRows, expenseRows, imageRows, invoiceItemRows] = await Promise.all([
        listPayments(id),
        listExpenses(id),
        listJobImages(id),
        listJobInvoiceItems(id),
      ]);
      setPayments(paymentRows);
      setExpenses(expenseRows);
      setImages(imageRows);
      setInvoiceItems(invoiceItemRows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [id, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onBack = () => {
    goBackOrReplace(router, { pathname: '/(tabs)/poslovi' as any });
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

  const onToggleArchive = useCallback(() => {
    if (!userId || !id || !job) return;

    if (job.archived_at) {
      Alert.alert(t('jobs.unarchiveTitle'), t('jobs.unarchiveMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('jobs.unarchive'),
          onPress: async () => {
            try {
              setError(null);
              await unarchiveJob(userId, id);
              await load();
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : String(e));
            }
          },
        },
      ]);
      return;
    }

    Alert.alert(t('jobs.archiveTitle'), t('jobs.archiveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.archive'),
        onPress: async () => {
          try {
            setError(null);
            await archiveJob(userId, id);
            await load();
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }, [id, job, load, t, userId]);

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

  const formatArchiveDate = useCallback(
    (value: string | null) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter]
  );

  const formatStatus = useCallback(
    (value: string | null) => {
      if (!value) return t('jobs.statusUnknown');
      if (value === 'scheduled') return t('jobs.statuses.scheduled');
      if (value === 'in_progress') return t('jobs.statuses.inProgress');
      if (value === 'pending') return t('jobs.statuses.pending');
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    },
    [locale, t]
  );

  const formatListDate = useCallback(
    (value: string | null) => {
      if (!value) return null;
      const parsed = parseDateInput(value);
      if (!parsed) return value;
      return `${parsed.getDate()}. ${parsed.getMonth() + 1}.`;
    },
    []
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
  const invoiceItemsTotal = useMemo(
    () => invoiceItems.reduce((sum, item) => sum + (item.total ?? 0), 0),
    [invoiceItems]
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
  const imageCarouselItems = useMemo(
    () => [
      ...images.map((item, index) => ({ type: 'saved' as const, item, index })),
      ...pendingImages.map((item) => ({ type: 'pending' as const, item })),
    ],
    [images, pendingImages]
  );
  const hasInvoiceItems = invoiceItems.length > 0;
  const previewImages = images;
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
  const userMeta = (session?.user?.user_metadata as Record<string, unknown> | undefined) ?? undefined;

  const onShareInvoice = useCallback(async () => {
    if (!job || !userId) return;

    setInvoiceSubmitting(true);
    setError(null);
    let generated = false;
    try {
      const invoiceRecord = await getOrCreateInvoiceForJob(userId, job.id);

      const file = await generateInvoicePdf({
        locale,
        invoiceNumberValue: invoiceRecord.invoice_number,
        issueDateValue: invoiceRecord.issued_at,
        labels: {
          invoiceTitle: t('jobs.invoice.title'),
          invoiceNumber: t('jobs.invoice.number'),
          issueDate: t('jobs.invoice.issueDate'),
          serviceDate: t('jobs.invoice.serviceDate'),
          servicePlace: t('jobs.invoice.servicePlace'),
          issuer: t('jobs.invoice.issuer'),
          client: t('jobs.invoice.client'),
          clientName: t('jobs.invoice.clientName'),
          clientAddress: t('jobs.invoice.clientAddress'),
          clientPhone: t('jobs.invoice.clientPhone'),
          pib: t('settings.companyPib'),
          registrationNumber: t('settings.companyRegistrationNumberShort'),
          accountNumber: t('settings.companyAccountNumber'),
          jobTitle: t('jobs.invoice.jobTitle'),
          jobDescription: t('jobs.invoice.jobDescription'),
          scheduledDate: t('jobs.invoice.scheduledDate'),
          completedDate: t('jobs.invoice.completedDate'),
          tableService: t('jobs.invoice.tableService'),
          tableUnit: t('jobs.invoice.tableUnit'),
          tableQuantity: t('jobs.invoice.tableQuantity'),
          tablePrice: t('jobs.invoice.tablePrice'),
          tableTotal: t('jobs.invoice.tableTotal'),
          unitService: t('jobs.invoice.unitService'),
          totalPrice: t('jobs.invoice.totalPrice'),
          totalPaid: t('jobs.invoice.totalPaid'),
          outstanding: t('jobs.invoice.outstanding'),
          tip: t('jobs.invoice.tip'),
          notesTitle: t('jobs.invoice.notesTitle'),
          taxNoteTitle: t('jobs.invoice.taxNoteTitle'),
          taxNoteBody: t('jobs.invoice.taxNoteBody'),
          validWithoutSignature: t('jobs.invoice.validWithoutSignature'),
          footer: t('jobs.invoice.footer'),
        },
        company: {
          name:
            typeof userMeta?.company_name === 'string' && userMeta.company_name.trim()
              ? userMeta.company_name
              : getUserDisplayName(session?.user, 'eTefter'),
          phone: typeof userMeta?.company_phone === 'string' ? userMeta.company_phone : null,
          address: typeof userMeta?.company_address === 'string' ? userMeta.company_address : null,
          pib: typeof userMeta?.company_pib === 'string' ? userMeta.company_pib : null,
          registrationNumber:
            typeof userMeta?.company_registration_number === 'string'
              ? userMeta.company_registration_number
              : null,
          accountNumber:
            typeof userMeta?.company_account_number === 'string'
              ? userMeta.company_account_number
              : null,
          logoUrl: typeof userMeta?.company_logo_url === 'string' ? userMeta.company_logo_url : null,
        },
        client: {
          name: job.client?.name ?? null,
          phone: job.client?.phone ?? null,
          address: job.client?.address ?? null,
        },
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          scheduledDate: job.scheduled_date,
          completedAt: job.completed_at,
          price: job.price,
          totalPaid,
          outstanding: outstanding ?? 0,
          tipAmount,
        },
        items: invoiceItems.map((item) => ({
          title: item.title ?? '—',
          unit: item.unit,
          quantity: item.quantity ?? 1,
          unitPrice: item.unit_price ?? 0,
          total: item.total ?? 0,
        })),
      });

      generated = true;
      setInvoiceSubmitting(false);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        await Print.printAsync({ uri: file.uri });
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: t('jobs.invoice.shareAction'),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setInvoiceSubmitting(false);
    } finally {
      if (!generated) {
        setInvoiceSubmitting(false);
      }
    }
  }, [invoiceItems, job, locale, outstanding, session?.user, t, tipAmount, totalPaid, userId, userMeta]);

  const resetItemForm = useCallback(() => {
    setEditingItem(null);
    setItemTitle('');
    setItemUnit('');
    setItemQuantity('');
    setItemUnitPrice('');
  }, []);

  const scrollToInvoiceItemForm = useCallback(() => {
    const formY = invoiceItemFormYRef.current || invoiceItemsContainerYRef.current;
    const targetY = Math.max(formY - (insets.top + 72), 0);
    mainScrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, [insets.top]);

  const openNewItemForm = useCallback(() => {
    resetItemForm();
    if (!hasInvoiceItems && job?.price) {
      setItemUnitPrice(String(job.price));
    }
    setError(null);
    setOpenInvoiceItemSwipeId(null);
    setItemFormClosing(false);
    setItemFormOpen(true);
  }, [hasInvoiceItems, job?.price, resetItemForm]);

  const openEditItemForm = useCallback((item: JobInvoiceItemRow) => {
    setEditingItem(item);
    setItemTitle(item.title ?? '');
    setItemUnit(item.unit ?? '');
    setItemQuantity(String(item.quantity ?? 1));
    setItemUnitPrice(String(item.unit_price ?? 0));
    setError(null);
    setOpenInvoiceItemSwipeId(null);
    setItemFormClosing(false);
    setItemFormOpen(true);
  }, []);

  const onOpenInvoiceItemSwipe = useCallback((itemId: string) => {
    setOpenInvoiceItemSwipeId(itemId);
  }, []);

  const onCloseInvoiceItemSwipe = useCallback((itemId: string) => {
    setOpenInvoiceItemSwipeId((current) => (current === itemId ? null : current));
  }, []);

  const closeItemFormWithFade = useCallback(() => {
    setItemFormClosing(true);
    Keyboard.dismiss();
    setTimeout(() => {
      setItemFormOpen(false);
      setItemFormClosing(false);
      setItemSubmitting(false);
      resetItemForm();
    }, 115);
  }, [resetItemForm]);

  const onInvoiceItemFormBlurAway = useCallback(() => {
    if (!itemFormOpen || itemFormClosing || itemSubmitting) return;
    setError(null);
    closeItemFormWithFade();
  }, [closeItemFormWithFade, itemFormClosing, itemFormOpen, itemSubmitting]);

  useEffect(() => {
    if (!itemFormOpen || editingItem || itemFormClosing) return;

    const firstTimer = setTimeout(scrollToInvoiceItemForm, 60);
    const secondTimer = setTimeout(scrollToInvoiceItemForm, 260);

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
    };
  }, [editingItem, itemFormClosing, itemFormOpen, keyboardHeight, scrollToInvoiceItemForm]);

  const onSubmitInvoiceItem = useCallback(async () => {
    if (!userId || !id) return;

    const title = itemTitle.trim();
    const quantity = Number(itemQuantity.replace(',', '.'));
    const unitPrice = Number(itemUnitPrice.replace(',', '.'));
    const unit = itemUnit.trim() || null;

    if (!title) {
      setError(t('jobs.invoiceItemsTitleRequired'));
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError(t('jobs.invoiceItemsQuantityInvalid'));
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError(t('jobs.invoiceItemsPriceInvalid'));
      return;
    }

    setItemSubmitting(true);
    setError(null);
    const previousItems = invoiceItems;
    const total = Math.round(quantity * unitPrice * 100) / 100;
    const optimisticId = editingItem?.id ?? `optimistic-${Date.now()}`;
    const optimisticItem: JobInvoiceItemRow = {
      id: optimisticId,
      job_id: id,
      user_id: userId,
      title,
      unit,
      quantity,
      unit_price: unitPrice,
      total,
      position: editingItem?.position ?? ((invoiceItems[0]?.position ?? 1) - 1),
      created_at: editingItem?.created_at ?? new Date().toISOString(),
    };

    if (editingItem) {
      setInvoiceItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? { ...item, ...optimisticItem, id: item.id } : item))
      );
    } else {
      setOptimisticCreatedItemId(optimisticId);
      setInvoiceItems((prev) => [optimisticItem, ...prev]);
    }
    closeItemFormWithFade();

    try {
      if (editingItem) {
        await updateJobInvoiceItem(editingItem.id, id, {
          title,
          unit,
          quantity,
          unit_price: unitPrice,
        });
      } else {
        await createJobInvoiceItem(userId, id, {
          title,
          unit,
          quantity,
          unit_price: unitPrice,
        });
      }
      await load();
      setOptimisticCreatedItemId(null);
    } catch (e: unknown) {
      setInvoiceItems(previousItems);
      setOptimisticCreatedItemId(null);
      setError(e instanceof Error ? e.message : String(e));
      setItemSubmitting(false);
    }
  }, [
    userId,
    id,
    itemTitle,
    itemQuantity,
    itemUnitPrice,
    itemUnit,
    t,
    invoiceItems,
    editingItem,
    closeItemFormWithFade,
    load,
  ]);

  const onDeleteInvoiceItem = useCallback(
    (item: JobInvoiceItemRow) => {
      if (!id) return;
      setOpenInvoiceItemSwipeId((current) => (current === item.id ? null : current));
      setInvoiceItems((prev) => prev.filter((invoiceItem) => invoiceItem.id !== item.id));
      void (async () => {
        try {
          setError(null);
          await deleteJobInvoiceItem(item.id, id);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : String(e));
          await load();
        }
      })();
    },
    [id, load]
  );

  const onPickImages = useCallback(
    (source: 'camera' | 'library') => {
      if (!userId || !id) return;
      const run = async () => {
        const imageKind: JobImageKind = 'before';
        try {
          if (source === 'camera') {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              setError(t('jobs.imagePermissions'));
              return;
            }
          }

          setUploadProgress({ done: 0, total: 0 });
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
            key: `image-${Date.now()}-${index}`,
          }));
          setPendingImages((prev) => [...prev, ...pending]);
          setUploadProgress({ done: 0, total: result.assets.length });
          for (let index = 0; index < result.assets.length; index += 1) {
            const asset = result.assets[index];
            try {
              const item = await uploadJobImage({
                userId,
                jobId: id,
                uri: asset.uri,
                kind: imageKind,
              });
              uploaded.push(item);
            } catch {
              failedCount += 1;
            } finally {
              setPendingImages((prev) => prev.filter((pendingItem) => pendingItem.key !== pending[index]?.key));
              setUploadProgress({ done: index + 1, total: result.assets.length });
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
          setPendingImages([]);
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
    () => {
      Alert.alert(t('jobs.chooseSourceTitle'), t('jobs.chooseSourceMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('jobs.photoGallery'), onPress: () => onPickImages('library') },
        { text: t('jobs.photoCamera'), onPress: () => onPickImages('camera') },
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
            setImages(nextImages);
            if (nextImages.length === 0) {
              setPreviewOpen(false);
              setPreviewIndex(0);
            } else {
              setPreviewIndex((current) => Math.min(current, nextImages.length - 1));
            }
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }, [images, previewImage, t]);

  const onOpenPreview = useCallback((index: number) => {
    setPreviewOpen(true);
    setPreviewIndex(index);
  }, []);

  const clearImageSelection = useCallback(() => {
    setSelectedImageIds([]);
  }, []);

  const toggleImageSelection = useCallback((id: string) => {
    setSelectedImageIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  }, []);

  const onClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewIndex(0);
    setAndroidZoom(1);
  }, []);

  const downloadImageToCache = useCallback(async (item: JobImageRow) => {
    const uri = getJobImageUri(item);
    if (!uri) return null;
    const extension = uri.split('?')[0]?.split('.').pop()?.toLowerCase() || 'jpg';
    const normalizedExtension = extension === 'png' ? 'png' : 'jpg';
    if (uri.startsWith('file://')) {
      return {
        uri,
        extension: normalizedExtension,
      };
    }
    const localFile = new File(Paths.cache, `job-image-${item.id}.${extension}`);
    await File.downloadFileAsync(uri, localFile);
    return {
      uri: localFile.uri,
      extension: normalizedExtension,
    };
  }, []);

  const onShareImageItem = useCallback(async (item: JobImageRow) => {
    const uri = getJobImageUri(item);
    if (!uri) return;
    try {
      const downloadedFile = await downloadImageToCache(item);
      if (!downloadedFile) return;
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        await Share.share({
          url: uri,
          message: uri,
        });
        return;
      }
      await Sharing.shareAsync(downloadedFile.uri, {
        mimeType: `image/${downloadedFile.extension === 'png' ? 'png' : 'jpeg'}`,
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
    const uri = getJobImageUri(item);
    if (!uri) return;
    try {
      const downloadedFile = await downloadImageToCache(item);
      if (!downloadedFile) return;
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        await Share.share({
          url: uri,
          message: uri,
        });
        return;
      }
      await Sharing.shareAsync(downloadedFile.uri, {
        mimeType: `image/${downloadedFile.extension === 'png' ? 'png' : 'jpeg'}`,
        dialogTitle: t('jobs.imageSaveAction'),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [downloadImageToCache, t]);

  const onShareAllImages = useCallback(async () => {
    const urls = images.map((item) => item.image_url).filter(Boolean) as string[];
    if (urls.length === 0) return;
    try {
      await Share.share({
        message: [t('jobs.images'), ...urls].join('\n'),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [images, t]);

  const onShareSelectedImages = useCallback(
    async (items: JobImageRow[]) => {
      const selectedItems = items.filter((item) => selectedImageIds.includes(item.id));
      if (selectedItems.length === 0) return;
      try {
        if (selectedItems.length === 1) {
          await onShareImageItem(selectedItems[0]);
        } else {
          const urls = selectedItems.map((item) => item.image_url).filter(Boolean) as string[];
          if (urls.length === 0) return;
          await Share.share({
            message: [t('jobs.images'), ...urls].join('\n'),
          });
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [onShareImageItem, selectedImageIds, t]
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

  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const secondaryLinkColor = colorScheme === 'dark' ? '#9DBDFF' : '#315FBA';

  const renderSectionHeader = useCallback((title: string, action?: React.ReactNode) => (
    <View className="mt-5">
      <View className="flex-row items-center justify-between px-1">
        <Text
          className="text-app-row-title font-semibold"
          style={{ color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3' }}>
          {title}
        </Text>
        {action ? <View className="ml-3 flex-row items-center">{action}</View> : null}
      </View>
      <View className="mt-2 h-px" style={{ backgroundColor: sectionSeparatorColor }} />
    </View>
  ), [colorScheme, sectionSeparatorColor]);

  const renderImagesSection = useCallback(() => {
    const selectionMode = selectedImageIds.length > 0;
    const selectedItems = images.filter((item) => selectedImageIds.includes(item.id));
    const selectionCount = selectedItems.length;
    const title = selectionMode
      ? t('jobs.imageSelectedCount', { count: selectionCount })
      : `${t('jobs.images')} (${imageCarouselItems.length})`;
    const carouselThumbSize = Math.max(68, thumbSize);
    const actions = (
      <>
        {selectionMode ? (
          <>
            <Pressable
              onPress={() => {
                void onShareSelectedImages(images);
              }}
              className="mr-2 h-10 w-10 items-center justify-center">
              <Ionicons name="share-social-outline" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => onDeleteSelectedImages(images)}
              className="mr-2 h-10 w-10 items-center justify-center">
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </Pressable>
            <Pressable
              onPress={clearImageSelection}
              className="h-10 w-10 items-center justify-center">
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </>
        ) : null}
      </>
    );

    return (
      <>
        {renderSectionHeader(title, actions)}
        <View style={{ marginTop: 8 }}>
          {uploadProgress ? (
            <Text className="ml-3 mt-2 text-app-meta-lg font-medium text-black/55 dark:text-white/65">
              {t('jobs.uploadingPhotos', {
                done: uploadProgress.done,
                total: uploadProgress.total,
              })}
            </Text>
          ) : null}

          {imageCarouselItems.length === 0 ? (
            <Text className="mt-3 px-4 text-center text-app-meta-lg italic text-black/60 dark:text-white/70">
              {t('jobs.noImages')}
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 12, paddingRight: 24, paddingTop: 12 }}>
              {imageCarouselItems.map((entry) => {
                const selected = entry.type === 'saved' && selectedImageIds.includes(entry.item.id);

                if (entry.type === 'pending') {
                  return (
                    <View
                      key={entry.item.key}
                      style={{ marginRight: GRID_GAP, width: carouselThumbSize, height: carouselThumbSize }}
                      className="overflow-hidden rounded-2xl">
                      <Image
                        source={{ uri: entry.item.uri }}
                        style={{
                          width: carouselThumbSize,
                          height: carouselThumbSize,
                          backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#E9EEF8',
                          opacity: 0.55,
                        }}
                      />
                      <View className="absolute inset-0 items-center justify-center bg-black/20">
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={entry.item.id}
                    onPress={() => {
                      if (selectionMode) {
                        toggleImageSelection(entry.item.id);
                      } else {
                        onOpenPreview(entry.index);
                      }
                    }}
                    onLongPress={() => toggleImageSelection(entry.item.id)}
                    style={{ marginRight: GRID_GAP }}>
                    <View>
                  <Image
                        source={{ uri: getJobImageUri(entry.item) ?? undefined }}
                        style={{
                          width: carouselThumbSize,
                          height: carouselThumbSize,
                          borderRadius: 18,
                          backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#E9EEF8',
                        }}
                      />
                      {selectionMode ? (
                        <View
                          className={`absolute inset-0 rounded-[18px] ${selected ? 'bg-[#1A4FE0]/28' : 'bg-black/12'}`}
                        />
                      ) : null}
                      {selectionMode ? (
                        <View className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full bg-black/55">
                          <Ionicons
                            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                            color="white"
                          />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </>
    );
  }, [
    clearImageSelection,
    colorScheme,
    colors.text,
    imageCarouselItems,
    images,
    onDeleteSelectedImages,
    onOpenPreview,
    onShareSelectedImages,
    renderSectionHeader,
    selectedImageIds,
    t,
    thumbSize,
    toggleImageSelection,
    uploadProgress,
  ]);

  const openNewPayment = useCallback(() => {
    if (!id) return;
    router.push({
      pathname: '/(tabs)/posao/[id]/payment/new' as any,
      params: { id, returnTo: 'job' },
    });
  }, [id, router]);

  const openNewExpense = useCallback(() => {
    if (!id) return;
    router.push({ pathname: '/(tabs)/posao/[id]/expense/new' as any, params: { id } });
  }, [id, router]);

  const floatingActions = useMemo<JobDetailFloatingAction[]>(
    () => [
      {
        key: 'invoice-item',
        label: t('fab.invoiceItem'),
        sublabel: t('fab.invoiceItemHint'),
        icon: 'document-text-outline',
        color: '#3C69D9',
        backgroundColor: colorScheme === 'dark' ? 'rgba(58,105,217,0.18)' : 'rgba(60,105,217,0.12)',
        onPress: openNewItemForm,
      },
      {
        key: 'payment',
        label: t('fab.payment'),
        sublabel: t('fab.paymentHint'),
        icon: 'wallet-outline',
        color: '#4CBF60',
        backgroundColor: colorScheme === 'dark' ? 'rgba(76,191,96,0.20)' : 'rgba(76,191,96,0.12)',
        onPress: openNewPayment,
      },
      {
        key: 'expense',
        label: t('fab.expense'),
        sublabel: t('fab.expenseHint'),
        icon: 'receipt-outline',
        color: '#FD2D65',
        backgroundColor: colorScheme === 'dark' ? 'rgba(253,45,101,0.18)' : 'rgba(253,45,101,0.12)',
        onPress: openNewExpense,
      },
      {
        key: 'photo',
        label: t('fab.photo'),
        sublabel: t('fab.photoHint'),
        icon: 'image-outline',
        color: '#4DB1A6',
        backgroundColor: colorScheme === 'dark' ? 'rgba(77,177,166,0.20)' : 'rgba(77,177,166,0.12)',
        onPress: onOpenAddPhoto,
      },
    ],
    [colorScheme, onOpenAddPhoto, openNewExpense, openNewItemForm, openNewPayment, t]
  );

  return (
    <>
      <View className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]">
        <CollapsingMainHeader
          title={job?.title || t('jobs.untitled')}
          iconName="briefcase-outline"
          scrollY={scrollY}
          left={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={onBack}
              className="h-11 w-11 items-center justify-center">
              <Ionicons name="chevron-back" size={25} color="#717983" />
            </Pressable>
          }
          right={
            <HeaderOverflowMenu
              accessibilityLabel={t('common.more')}
              actions={[
                { label: t('jobs.edit'), iconName: 'create-outline', onPress: onEdit },
                { label: t('jobs.invoice.shareAction'), iconName: 'document-text-outline', onPress: () => { void onShareInvoice(); } },
                { label: t('jobs.imageShareAllAction'), iconName: 'images-outline', onPress: () => { void onShareAllImages(); } },
                { label: t('jobs.delete'), iconName: 'trash-outline', onPress: onDelete, destructive: true },
              ]}
            />
          }
        />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <Animated.ScrollView
        ref={mainScrollRef}
        className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: quickFindSwipe.onScroll,
        })}
        {...quickFindSwipe.touchHandlers}
        refreshControl={quickFindSwipe.refreshControl}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 192 + keyboardHeight }}>
      <View className="px-6 pt-4">
        <MainScreenTitle
          title={job?.title || t('jobs.untitled')}
          iconName="briefcase-outline"
          scrollY={scrollY}
        />
        <View className="-mt-4 mb-1 flex-row items-center px-1">
          <Ionicons name="person-outline" size={16} color={colors.secondaryText} />
          <Text className="ml-1.5 text-app-subtitle text-black/60 dark:text-white/70">
            {job?.client?.name || t('jobs.noClient')}
          </Text>
        </View>
        {job?.archived_at ? (
          <View className="mb-1 ml-1 mt-2 self-start">
            <Text className="text-app-meta text-[#6C789A] dark:text-white/80">
              {t('jobs.archived')}
            </Text>
          </View>
        ) : null}
        <SyncStatusIndicator />
        {renderSectionHeader(t('jobs.overviewTitle'))}
        <View style={{ marginLeft: 12, marginTop: 8 }}>
          {loading && !job ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : job ? (
            <>
              <View className="flex-row items-center justify-between">
                <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.dateLabel')}</Text>
                <Text className="text-app-row text-black dark:text-white">{formatDate(job.scheduled_date)}</Text>
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.statusLabel')}</Text>
                <View className="flex-row items-center">
                  <Text className="text-app-row text-black dark:text-white">
                    {job.archived_at ? t('jobs.archived') : formatStatus(job.status)}
                  </Text>
                  {job.completed_at ? (
                    <>
                      <Text className="mx-2 text-app-meta-lg text-black/30 dark:text-white/30">•</Text>
                      <Text className="text-app-row text-black dark:text-white">
                        {formatCompletedDate(job.completed_at)}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>

              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">
                  {t('jobs.reminderLabel')}
                </Text>
                <Text className="text-app-row text-black dark:text-white">{formatReminder(reminderType)}</Text>
              </View>

              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.priceLabel')}</Text>
                <Text className="text-app-row text-black dark:text-white">
                {formatPrice(job.price)}
                </Text>
              </View>

              {(job.archived_at || job.status === 'done') ? (
                <>
                  <View className="mt-2 flex-row items-center justify-between">
                    <View className="mr-4 flex-1">
                      <Text className="text-app-meta font-medium text-black/60 dark:text-white/70">
                        {job.archived_at ? t('jobs.archivedLabel') : t('jobs.archiveReadyLabel')}
                      </Text>
                  <Text className="mt-0.5 text-app-row text-black dark:text-white">
                        {job.archived_at
                          ? formatArchiveDate(job.archived_at) || t('jobs.archived')
                          : t('jobs.archiveReadyBody')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={onToggleArchive}
                      className="py-2">
                      <Text
                        className="text-app-meta font-semibold"
                        style={{ color: secondaryLinkColor }}>
                        {job.archived_at ? t('jobs.unarchive') : t('jobs.archive')}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {job.description ? (
                <>
                  <Text className="mt-2 text-app-meta-lg font-medium text-black/60 dark:text-white/70">
                    {t('jobs.descriptionLabel')}
                  </Text>
                  <Text className="mt-1.5 text-app-body text-black/80 dark:text-white/80">{job.description}</Text>
                </>
              ) : null}

            </>
          ) : (
            <Text className="px-4 text-center text-app-meta italic text-black/60 dark:text-white/70">{t('jobs.notFound')}</Text>
          )}

          {error ? <Text className="mt-3 text-app-meta text-red-600">{error}</Text> : null}
        </View>

        {renderSectionHeader(t('jobs.invoiceSection'))}
        <View
          onLayout={(event) => {
            invoiceItemsContainerYRef.current = event.nativeEvent.layout.y;
          }}
          style={{ marginLeft: 12, marginTop: 8 }}>
          {itemFormOpen && !editingItem ? (
            <InvoiceItemInlineFormRow
              title={itemTitle}
              quantity={itemQuantity}
              unitPrice={itemUnitPrice}
              titlePlaceholder={t('jobs.invoiceItemsFieldTitle')}
              quantityPlaceholder={t('jobs.invoiceItemsFieldQuantity')}
              unitPricePlaceholder={i18n.language.startsWith('sr') ? 'Cena po JM' : 'Unit price'}
              colors={colors}
              colorScheme={colorScheme}
              closing={itemFormClosing}
              submitting={itemSubmitting}
              onBlurAway={onInvoiceItemFormBlurAway}
              onChangeTitle={setItemTitle}
              onChangeQuantity={setItemQuantity}
              onChangeUnitPrice={setItemUnitPrice}
              onLayout={(event) => {
                invoiceItemFormYRef.current = invoiceItemsContainerYRef.current + event.nativeEvent.layout.y;
              }}
              onSubmit={() => {
                void onSubmitInvoiceItem();
              }}
            />
          ) : null}

          {hasInvoiceItems ? (
            <View>
              {invoiceItems.map((item, index) => {
                const isEditingThisItem = itemFormOpen && editingItem?.id === item.id;
                const shouldHideBehindCreateInput = itemFormOpen && !editingItem && item.id === optimisticCreatedItemId;
                if (shouldHideBehindCreateInput) return null;
                if (isEditingThisItem) {
                  return (
                    <InvoiceItemInlineFormRow
                      key={item.id}
                      marginTop={index > 0 ? INVOICE_ITEM_ROW_GAP : itemFormOpen && !editingItem ? INVOICE_ITEM_ROW_GAP : 0}
                      title={itemTitle}
                      quantity={itemQuantity}
                      unitPrice={itemUnitPrice}
                      titlePlaceholder={t('jobs.invoiceItemsFieldTitle')}
                      quantityPlaceholder={t('jobs.invoiceItemsFieldQuantity')}
                      unitPricePlaceholder={i18n.language.startsWith('sr') ? 'Cena po JM' : 'Unit price'}
                      colors={colors}
                      colorScheme={colorScheme}
                      closing={itemFormClosing}
                      submitting={itemSubmitting}
                      onBlurAway={onInvoiceItemFormBlurAway}
                      onChangeTitle={setItemTitle}
                      onChangeQuantity={setItemQuantity}
                      onChangeUnitPrice={setItemUnitPrice}
                      onLayout={(event) => {
                        invoiceItemFormYRef.current = invoiceItemsContainerYRef.current + event.nativeEvent.layout.y;
                      }}
                      onSubmit={() => {
                        void onSubmitInvoiceItem();
                      }}
                    />
                  );
                }
                return (
                  <InvoiceItemSwipeRow
                    key={item.id}
                    item={item}
                    index={index + (itemFormOpen && !editingItem ? 1 : 0)}
                    locale={locale}
                    colors={colors}
                    colorScheme={colorScheme}
                    formatPrice={formatPrice}
                    unitLabel={t('jobs.invoice.unitService')}
                    untitledLabel={t('jobs.invoiceItemsUntitled')}
                    onEdit={openEditItemForm}
                    onDelete={onDeleteInvoiceItem}
                    isSwipeOpen={openInvoiceItemSwipeId === item.id}
                    onSwipeOpen={onOpenInvoiceItemSwipe}
                    onSwipeClose={onCloseInvoiceItemSwipe}
                  />
                );
              })}
              <View className="mt-4 h-px bg-black/10 dark:bg-white/10" />
              <View className="mt-3 flex-row items-center justify-between pl-2">
                <Text className="text-app-row font-semibold text-black/60 dark:text-white/70">
                  {t('jobs.invoiceItemsTotal')}
                </Text>
                <Text className="text-app-row text-right font-semibold text-black dark:text-white">
                  {formatPrice(invoiceItemsTotal)}
                </Text>
              </View>
            </View>
          ) : !itemFormOpen ? (
            <Text className="mt-3 px-4 text-center text-app-meta-lg italic text-black/60 dark:text-white/70">
              {t('jobs.invoiceItemsEmpty')}
            </Text>
          ) : null}
        </View>

        {renderSectionHeader(t('jobs.financials'))}
        <View style={{ marginLeft: 12, marginTop: 8 }}>

          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.profit')}</Text>
              <Text className="text-app-row font-semibold text-[#2F8C57] dark:text-[#7AD69C]">
                {formatPrice(profit)}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.totalPaid')}</Text>
              <Text className="text-app-row text-black dark:text-white">
                {formatPrice(totalPaid)}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.totalExpenses')}</Text>
              <Text className="text-app-row text-black dark:text-white">
                {formatPrice(totalExpense)}
              </Text>
            </View>
            {tipAmount > 0 ? (
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.tip')}</Text>
                <Text className="text-app-row font-semibold text-[#2F8C57] dark:text-[#7AD69C]">
                  {formatPrice(tipAmount)}
                </Text>
              </View>
            ) : null}
            {outstanding != null && outstanding > 0 ? (
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.outstanding')}</Text>
                <Text className="text-app-row text-black dark:text-white">
                  {formatPrice(outstanding)}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="my-4 h-px bg-black/10 dark:bg-white/10" />
          <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.payments')}</Text>
          {payments.length === 0 ? (
            <Text className="mt-2 px-4 text-center text-app-meta-lg italic text-black/60 dark:text-white/70">{t('jobs.noPayments')}</Text>
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
                className="mt-2 flex-row items-center justify-between pl-3">
                <View className="flex-1 pr-4">
                  <View className="flex-row items-center">
                    {p.payment_date ? (
                      <Text
                        style={{
                          marginRight: 5,
                          color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3',
                          fontSize: 12,
                        }}>
                        {formatListDate(p.payment_date)}
                      </Text>
                    ) : null}
                    <Text className="flex-1 text-app-meta-lg text-black/80 dark:text-white/80" numberOfLines={1}>
                      {p.note || t('jobs.payment')}
                    </Text>
                  </View>
                </View>
                <Text className="text-app-meta-lg text-black/70 dark:text-white/80">
                  {formatPrice(p.amount ?? 0)}
                </Text>
              </Pressable>
            ))
          )}

          <View className="my-4" />
          <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.expenses')}</Text>
          {expenses.length === 0 ? (
            <Text className="mt-2 px-4 text-center text-app-meta-lg italic text-black/60 dark:text-white/70">{t('jobs.noExpenses')}</Text>
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
                className="mt-2 flex-row items-center justify-between pl-3">
                <View className="flex-1 pr-4">
                  <View className="flex-row items-center">
                    {e.created_at ? (
                      <Text
                        style={{
                          marginRight: 5,
                          color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3',
                          fontSize: 12,
                        }}>
                        {formatListDate(e.created_at)}
                      </Text>
                    ) : null}
                    <Text className="flex-1 text-app-meta-lg text-black/80 dark:text-white/80" numberOfLines={1}>
                      {e.title || t('jobs.expense')}
                    </Text>
                  </View>
                </View>
                <Text className="text-app-meta-lg text-black/70 dark:text-white/80">
                  {formatPrice(e.amount ?? 0)}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        {renderImagesSection()}

        </View>
      </Animated.ScrollView>
      </KeyboardAvoidingView>
      </View>

      <JobDetailFloatingActions actions={floatingActions} />

      <Modal transparent visible={previewOpen && previewImages.length > 0} animationType="fade" onRequestClose={onClosePreview}>
        <View className="flex-1 bg-black">
          <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-6" style={{ paddingTop: insets.top + 12 }}>
            <Pressable
              onPress={onClosePreview}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/12">
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
            <View className="flex-row items-center">
              {previewImages.length > 1 ? (
                <Text className="mr-3 text-app-meta font-semibold text-white/80">
                  {previewIndex + 1} / {previewImages.length}
                </Text>
              ) : null}
              <Pressable
                onPress={onShareImage}
                disabled={!getJobImageUri(previewImage)}
                className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-white/12 disabled:opacity-40">
                <Ionicons name="share-outline" size={18} color="white" />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (previewImage) {
                    void onSaveImageItem(previewImage);
                  }
                }}
                disabled={!getJobImageUri(previewImage)}
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
                <Text className="text-app-meta font-semibold text-white">
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
                <Text className="mx-2 min-w-[44px] text-center text-app-meta font-semibold text-white/90">
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
                  <Text className="text-app-meta font-semibold text-white/80">{t('jobs.imageResetZoom')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <FlatList
            key={`images-${previewImages.length}`}
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
                    source={{ uri: getJobImageUri(item) ?? undefined }}
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
                    source={{ uri: getJobImageUri(item) ?? undefined }}
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
