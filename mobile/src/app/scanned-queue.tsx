import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { User } from "../types/user";
import {
  isInsufficientCredits,
  uploadCards,
} from "../services/scanService";
import {
  auth,
  db,
} from "../services/firebase";
import {
  createCreditNotification,
  createNotification,
  sendPushNotification,
} from "../services/notificationService";

const CardItem = memo(({
  item,
  index,
  selected,
  onPress,
  onZoom,
  imageAspectRatio,
}: {
  item: string;
  index: number;
  selected: boolean;
  onPress: () => void;
  onZoom: () => void;
  imageAspectRatio?: number;
}) => (
  <TouchableOpacity
    activeOpacity={0.88}
    style={[
      styles.cardContainer,
      {
        width: imageAspectRatio && imageAspectRatio < 1
          ? "82%"
          : "100%",
        aspectRatio: imageAspectRatio || 1.55,
      },
      !selected && styles.unselectedCard,
    ]}
    onPress={onPress}
  >
    <Image
      source={{ uri: item }}
      style={styles.cardImage}
      resizeMode="contain"
    />

    <View
      pointerEvents="none"
      style={[
        styles.imageOverlay,
        selected && styles.selectedOverlay,
      ]}
    />

    <View
      pointerEvents="none"
      style={[
        styles.selectionButton,
        selected && styles.selectionButtonActive,
      ]}
    >
      {selected ? (
        <Ionicons
          name="checkmark"
          size={15}
          color="#FFFFFF"
        />
      ) : (
        <View style={styles.unselectedCircle} />
      )}
    </View>

    {selected && (
      <TouchableOpacity
        activeOpacity={0.82}
        style={styles.zoomButton}
        onPress={(event) => {
          event.stopPropagation();
          onZoom();
        }}
      >
        <Ionicons
          name="expand-outline"
          size={17}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    )}

    <View
      pointerEvents="none"
      style={styles.cardNumber}
    >
      <Text style={styles.cardNumberText}>
        Card {index + 1}
      </Text>
    </View>
  </TouchableOpacity>
));

export default function ScannedQueueScreen() {
  const insets = useSafeAreaInsets();

  const [
    queueImages,
    setQueueImages,
  ] = useState<string[]>(
    (globalThis as any).scannedImages ||
      []
  );

  const [
    selectedCards,
    setSelectedCards,
  ] = useState<number[]>(
    queueImages.map(
      (_: string, index: number) =>
        index
    )
  );

  const [zoomedImage, setZoomedImage] =
    useState<string | null>(null);

  // Keep the preview card ratio aligned with the actual captured image.
  // This is important for vertical business cards so they are not forced
  // into the horizontal thumbnail shape.
  const [imageAspectRatios, setImageAspectRatios] =
    useState<Record<string, number>>({});

  // The scanner records the orientation of each individual photo.
  // This allows a single scan batch to contain both portrait and landscape cards.
  const scannedCardOrientations =
    (globalThis as any).scannedCardOrientations || {};

  useEffect(() => {
    queueImages.forEach((uri) => {
      if (imageAspectRatios[uri]) return;

      Image.getSize(
        uri,
        (width, height) => {
          if (width > 0 && height > 0) {
            const detectedRatio = width / height;
            const orientation =
              scannedCardOrientations[uri];

            const ratio =
              orientation === "portrait"
                ? 1 / 1.62
                : orientation === "landscape"
                  ? 1.62
                  : detectedRatio;

            setImageAspectRatios((current) => {
              if (current[uri]) return current;
              return {
                ...current,
                [uri]: ratio,
              };
            });
          }
        },
        (error) => {
          console.log("Unable to read card image size:", error);
        }
      );
    });
  }, [queueImages, imageAspectRatios]);

  // Use two independent columns so portrait and landscape cards can have
  // different heights without creating the large row gaps from numColumns.
  const masonryColumns = useMemo(() => {
    const columns: { item: string; index: number }[][] = [[], []];
    const heights = [0, 0];

    queueImages.forEach((item, index) => {
      const ratio = imageAspectRatios[item] || 1.55;
      const isPortrait = ratio < 1;
      const widthFactor = isPortrait ? 0.82 : 1;
      const estimatedHeight = widthFactor / ratio + 0.08;

      const columnIndex = heights[0] <= heights[1] ? 0 : 1;
      columns[columnIndex].push({ item, index });
      heights[columnIndex] += estimatedHeight;
    });

    return columns;
  }, [queueImages, imageAspectRatios]);

  const [loading, setLoading] =
    useState(false);

  const [extractedCount, setExtractedCount] =
    useState(0);

  const fadeAnim = useRef(
    new Animated.Value(0)
  ).current;

  const scaleAnim = useRef(
    new Animated.Value(0.85)
  ).current;

  const [userData, setUserData] =
    useState<User | null>(null);

  useEffect(() => {
    if (loading) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();

      let count = 0;
      const total = selectedCards.length;
      const interval = setInterval(() => {
        count = Math.min(count + 1, total);
        setExtractedCount(count);
        if (count >= total) {
          clearInterval(interval);
        }
      }, 600);
      return () => clearInterval(interval);
    } else {
      setExtractedCount(0);
    }
  }, [loading]);

  useEffect(() => {
    if (!auth.currentUser) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(
        db,
        "users",
        auth.currentUser.uid
      ),
      (snapshot) => {
        if (snapshot.exists()) {
          setUserData(
            snapshot.data() as User
          );
        }
      },
      (error) => {
        console.log(
          "User listener error:",
          error
        );
      }
    );

    return unsubscribe;
  }, []);

  const toggleCard = useCallback(
    (index: number) => {
      setSelectedCards(
        (currentCards) => {
          if (
            currentCards.includes(index)
          ) {
            return currentCards.filter(
              (item) => item !== index
            );
          }

          return [
            ...currentCards,
            index,
          ];
        }
      );
    },
    []
  );

  const selectAllCards = () => {
    if (
      selectedCards.length ===
      queueImages.length
    ) {
      setSelectedCards([]);
      return;
    }

    setSelectedCards(
      queueImages.map(
        (_: string, index: number) =>
          index
      )
    );
  };

  const handleExtract = async () => {
    if (
      selectedCards.length === 0
    ) {
      Alert.alert(
        "No Cards Selected",
        "Please select at least one card."
      );
      return;
    }

    if (!auth.currentUser) {
      Alert.alert(
        "Login Required",
        "Please log in again before extracting cards."
      );
      return;
    }

    try {
      setLoading(true);

      const selectedImages =
        queueImages.filter(
          (
            _: string,
            index: number
          ) =>
            selectedCards.includes(
              index
            )
        );

      const totalLimit =
  userData?.totalScans ??
  userData?.freeScanLimit ??
  0;

const currentUsed =
  userData?.usedScans ??
  userData?.freeScansUsed ??
  0;

      const remainingScans =
        Math.max(
          totalLimit - currentUsed,
          0
        );

      if (remainingScans <= 0) {
        await createCreditNotification({
          remaining: 0,
          used: currentUsed,
          total: totalLimit,
        });

        setLoading(false);

        Alert.alert(
          "No Scans Remaining",
          "You have used all available scans. Upgrade your plan to continue.",
          [
            {
              text: "Upgrade",
              onPress: () =>
                router.push("/plans"),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );

        return;
      }

      if (
        selectedImages.length >
        remainingScans
      ) {
        setLoading(false);

        Alert.alert(
          "Scan Limit Reached",
          `You selected ${selectedImages.length} cards, but only ${remainingScans} scan${
            remainingScans === 1
              ? ""
              : "s"
          } remain.`,
          [
            {
              text: "Upgrade",
              onPress: () =>
                router.push("/plans"),
            },
            {
              text: "Choose Again",
              style: "cancel",
            },
          ]
        );

        return;
      }

      // The server checks and deducts credits; the check above is just for a faster message.
      const result =
        await uploadCards(
          selectedImages
        );

      const extractedCards =
        Array.isArray(result?.cards)
          ? result.cards
          : [];

      if (
        extractedCards.length === 0
      ) {
        await createNotification({
          type: "extraction_failed",
          title: "No card details found",
          message:
            "No readable business card details could be extracted. Please scan the cards again.",
          actionRoute: "/scanner",
          eventKey:
            `extraction-empty-${Date.now()}`,
        });

        sendPushNotification(
          "No card details found",
          "No readable business card details could be extracted. Please scan the cards again.",
          "/scanner"
        );

        Alert.alert(
          "No Details Found",
          "No readable card details were found. Please scan the cards again."
        );

        return;
      }

      const newUsed =
        result.credits?.used ??
        currentUsed +
          extractedCards.length;

      const newTotal =
        result.credits?.total ??
        totalLimit;

      const newRemaining =
        result.credits?.remaining ??
        Math.max(
          newTotal - newUsed,
          0
        );

      await createNotification({
        type: "extraction_success",
        title: "Cards extracted",
        message: `${extractedCards.length} ${
          extractedCards.length === 1
            ? "business card was"
            : "business cards were"
        } extracted successfully.`,
        actionRoute: "/saved-contacts",
        eventKey:
          `extraction-success-${Date.now()}-${extractedCards.length}`,
      });

      sendPushNotification(
        "Cards extracted",
        `${extractedCards.length} ${
          extractedCards.length === 1
            ? "business card was"
            : "business cards were"
        } extracted successfully.`,
        "/saved-contacts"
      );

      await createCreditNotification({
        remaining: newRemaining,
        used: newUsed,
        total: newTotal,
      });

      (
        globalThis as any
      ).extractedCards =
        extractedCards;

      (
        globalThis as any
      ).scannedImages = [];

      (
        globalThis as any
      ).scannedCardOrientations = {};

      setQueueImages([]);
      setSelectedCards([]);

      router.push("/contacts");

      if (result.partialError) {
        Alert.alert(
          "Some Cards Not Scanned",
          `${extractedCards.length} of ${selectedImages.length} cards were scanned. ${result.partialError.message}`
        );
      }
    } catch (error) {
      console.error(
        "Extraction failed:",
        error instanceof Error
          ? error.message
          : error
      );

      if (isInsufficientCredits(error)) {
        Alert.alert(
          "Not Enough Scans",
          (error as Error).message,
          [
            {
              text: "Upgrade",
              onPress: () =>
                router.push("/plans"),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
        return;
      }

      await createNotification({
        type: "extraction_failed",
        title: "Extraction failed",
        message:
          "We could not extract the selected business cards. Please try again.",
        actionRoute: "/scanner",
        eventKey:
          `extraction-failed-${Date.now()}`,
      });

      sendPushNotification(
        "Extraction failed",
        "We could not extract the selected business cards. Please try again.",
        "/scanner"
      );

      Alert.alert(
        "Extraction Failed",
        "Failed to extract card details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    Alert.alert(
      "Clear All Cards?",
      "This will remove every scanned card from the current queue.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            (
              globalThis as any
            ).scannedImages = [];

            (
              globalThis as any
            ).scannedCardOrientations = {};

            setQueueImages([]);
            setSelectedCards([]);
          },
        },
      ]
    );
  };

  const remainingScans =
  Math.max(
    (userData?.totalScans ?? userData?.freeScanLimit ?? 0) -
      (userData?.usedScans ?? userData?.freeScansUsed ?? 0),
    0
  );

  const allSelected =
    queueImages.length > 0 &&
    selectedCards.length ===
      queueImages.length;

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#20262C"
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Scanned Cards
            </Text>

            <Text
              style={styles.subtitle}
            >
              Review cards before extraction
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text
              style={styles.countText}
            >
              {queueImages.length}
            </Text>
          </View>
        </View>

        {queueImages.length > 0 ? (
          <>
            <View
              style={
                styles.summaryCard
              }
            >
              <View
                style={
                  styles.summaryIcon
                }
              >
                <Ionicons
                  name="images-outline"
                  size={22}
                  color="#EFA300"
                />
              </View>

              <View
                style={
                  styles.summaryContent
                }
              >
                <Text
                  style={
                    styles.summaryTitle
                  }
                >
                  {selectedCards.length} of{" "}
                  {
                    queueImages.length
                  }{" "}
                  selected
                </Text>

                <Text
                  style={
                    styles.summaryText
                  }
                >
                  Select the cards you want
                  the AI to process.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                style={
                  styles.selectAllButton
                }
                onPress={
                  selectAllCards
                }
              >
                <Text
                  style={
                    styles.selectAllText
                  }
                >
                  {allSelected
                    ? "Deselect"
                    : "Select all"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.usageContainer
              }
            >
              <View
                style={styles.usageItem}
              >
                <Text
                  style={styles.usageLabel}
                >
                  Selected
                </Text>

                <Text
                  style={styles.usageValue}
                >
                  {
                    selectedCards.length
                  }
                </Text>
              </View>

              <View
                style={
                  styles.usageDivider
                }
              />

              <View
                style={styles.usageItem}
              >
                <Text
                  style={styles.usageLabel}
                >
                  Scans remaining
                </Text>

                <Text
                  style={[
                    styles.usageValue,
                    remainingScans <= 0 &&
                      styles.limitValue,
                  ]}
                >
                  {remainingScans}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        {queueImages.length > 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.masonryContainer,
              { paddingBottom: 150 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {masonryColumns.map((column, columnIndex) => (
              <View
                key={`masonry-column-${columnIndex}`}
                style={styles.masonryColumn}
              >
                {column.map(({ item, index }) => (
                  <CardItem
                    key={`${item}-${index}`}
                    item={item}
                    index={index}
                    selected={selectedCards.includes(index)}
                    onPress={() => toggleCard(index)}
                    onZoom={() => setZoomedImage(item)}
                    imageAspectRatio={imageAspectRatios[item]}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.emptyListContent, { flex: 1 }]}>
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="scan-outline"
                  size={40}
                  color="#09A84E"
                />
              </View>

              <Text style={styles.emptyTitle}>
                No cards scanned
              </Text>

              <Text style={styles.emptyText}>
                Scan a business card first,
                then return here to review
                and extract its details.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.scanButton}
                onPress={() => router.back()}
              >
                <Ionicons
                  name="camera-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text style={styles.scanButtonText}>
                  Open Scanner
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {queueImages.length > 0 && (
          <View
            style={[
              styles.bottomContainer,
              {
                paddingBottom:
                  Math.max(
                    insets.bottom,
                    14
                  ),
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.extractButton,
                (loading ||
                  selectedCards.length ===
                    0) &&
                  styles.disabledButton,
              ]}
              onPress={handleExtract}
              disabled={
                loading ||
                selectedCards.length === 0
              }
            >
              <View
                style={
                  styles.extractIcon
                }
              >
                <Ionicons
                  name="sparkles"
                  size={19}
                  color={
                    selectedCards.length >
                    0
                      ? "#09A84E"
                      : "#98A09B"
                  }
                />
              </View>

              <View
                style={
                  styles.extractContent
                }
              >
                <Text
                  style={[
                    styles.extractText,
                    selectedCards.length ===
                      0 &&
                      styles.disabledText,
                  ]}
                >
                  Extract Selected
                </Text>

                <Text
                  style={[
                    styles.extractSubtext,
                    selectedCards.length ===
                      0 &&
                      styles.disabledSubtext,
                  ]}
                >
                  {selectedCards.length}{" "}
                  {selectedCards.length ===
                  1
                    ? "card"
                    : "cards"}{" "}
                  ready
                </Text>
              </View>

              <Ionicons
                name="arrow-forward"
                size={20}
                color={
                  selectedCards.length >
                  0
                    ? "#FFFFFF"
                    : "#98A09B"
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.clearButton}
              onPress={clearAll}
              disabled={loading}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color="#E05252"
              />

              <Text
                style={styles.clearText}
              >
                Clear all cards
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          visible={zoomedImage !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomedImage(null)}
        >
          <View style={styles.zoomOverlay}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.zoomCloseButton}
              onPress={() => setZoomedImage(null)}
            >
              <Ionicons
                name="close"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {zoomedImage ? (
              <Image
                source={{ uri: zoomedImage }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            ) : null}

            <View style={styles.zoomHint}>
              <Ionicons
                name="scan-outline"
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.zoomHintText}>
                Preview card
              </Text>
            </View>
          </View>
        </Modal>

        <Modal
          visible={loading}
          transparent
          animationType="fade"
        >
          <View
            style={
              styles.loadingOverlay
            }
          >
            <Animated.View
              style={[
                styles.loadingCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              <View
                style={
                  styles.loadingIcon
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#ED5447"
                />
              </View>

              <Text
                style={
                  styles.loadingTitle
                }
              >
                Processing Cards
              </Text>

              <Text
                style={
                  styles.loadingSubtitle
                }
              >
                Our AI is extracting contact
                details from your selected
                cards. Please wait a few
                seconds.
              </Text>

              <View
                style={
                  styles.loadingProgress
                }
              >
                <Text
                  style={
                    styles.loadingProgressText
                  }
                >
                  {extractedCount} /{" "}
                  {selectedCards.length}{" "}
                  scanned
                </Text>
              </View>

              <View
                style={
                  styles.loadingBarBg
                }
              >
                <View
                  style={[
                    styles.loadingBarFill,
                    {
                      width: `${
                        (extractedCount /
                          Math.max(
                            selectedCards.length,
                            1
                          )) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },

  header: {
    minHeight: 78,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    color: "#171C21",
    fontSize: 22,
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 3,
    color: "#858D95",
    fontSize: 12.5,
    fontWeight: "500",
  },

  countBadge: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    color: "#09A84E",
    fontSize: 16,
    fontWeight: "900",
  },

  summaryCard: {
    marginTop: 8,
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF5DE",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryContent: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },

  summaryTitle: {
    color: "#252B28",
    fontSize: 14,
    fontWeight: "800",
  },

  summaryText: {
    marginTop: 4,
    color: "#89918D",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },

  selectAllButton: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  selectAllText: {
    color: "#078E42",
    fontSize: 11,
    fontWeight: "800",
  },

  usageContainer: {
    marginTop: 12,
    marginHorizontal: 20,
    minHeight: 68,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFF5DE",
    borderWidth: 1,
    borderColor: "#F5E6B8",
    flexDirection: "row",
    alignItems: "center",
  },

  usageItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  usageLabel: {
    color: "#728078",
    fontSize: 11,
    fontWeight: "600",
  },

  usageValue: {
    marginTop: 4,
    color: "#EFA300",
    fontSize: 18,
    fontWeight: "900",
  },

  limitValue: {
    color: "#E05252",
  },

  usageDivider: {
    width: 1,
    height: 35,
    backgroundColor: "#F5E6B8",
  },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
  },

  masonryContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingTop: 18,
    gap: 10,
  },

  masonryColumn: {
    flex: 1,
    alignItems: "flex-start",
    gap: 10,
  },

  cardContainer: {
    width: "100%",
    marginBottom: 0,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E9EEEB",
    borderWidth: 2,
    borderColor: "#09A84E",

    shadowColor: "#17261D",
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  unselectedCard: {
    borderColor: "#E1E6E3",
    opacity: 0.58,
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor:
      "rgba(20, 25, 22, 0.12)",
  },

  selectedOverlay: {
    backgroundColor:
      "rgba(9, 168, 78, 0.05)",
  },

  selectionButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor:
      "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },

  selectionButtonActive: {
    backgroundColor: "#09A84E",
    borderColor: "#09A84E",
  },

  unselectedCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#8A938E",
  },

  cardNumber: {
    position: "absolute",
    left: 8,
    bottom: 8,
    minHeight: 25,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor:
      "rgba(18, 24, 21, 0.68)",
    alignItems: "center",
    justifyContent: "center",
  },

  zoomButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(20, 27, 23, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  zoomImage: {
    width: "100%",
    height: "78%",
  },

  zoomCloseButton: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  zoomHint: {
    position: "absolute",
    bottom: 38,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  zoomHintText: {
    marginLeft: 7,
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
  },

  cardNumberText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
  },

  bottomContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 8,
    paddingTop: 13,
    paddingHorizontal: 13,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",

    shadowColor: "#17261D",
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    elevation: 10,
  },

  extractButton: {
    minHeight: 58,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  disabledButton: {
    backgroundColor: "#E6EBE8",
    shadowOpacity: 0,
    elevation: 0,
  },

  extractIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor:
      "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  extractContent: {
    flex: 1,
    marginLeft: 12,
  },

  extractText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },

  extractSubtext: {
    marginTop: 2,
    color:
      "rgba(255,255,255,0.78)",
    fontSize: 10.5,
    fontWeight: "500",
  },

  disabledText: {
    color: "#87908B",
  },

  disabledSubtext: {
    color: "#A1A8A4",
  },

  clearButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  clearText: {
    marginLeft: 7,
    color: "#E05252",
    fontSize: 12.5,
    fontWeight: "800",
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  emptyState: {
    paddingHorizontal: 28,
    alignItems: "center",
  },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 18,
    color: "#222824",
    fontSize: 20,
    fontWeight: "800",
  },

  emptyText: {
    maxWidth: 310,
    marginTop: 8,
    color: "#7E8782",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  scanButton: {
    minHeight: 50,
    marginTop: 22,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  scanButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  loadingOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(13, 19, 16, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingCard: {
    width: "100%",
    maxWidth: 340,
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    alignItems: "center",

    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 10,
  },

  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#FFF0EE",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingTitle: {
    marginTop: 17,
    color: "#202622",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },

  loadingSubtitle: {
    marginTop: 8,
    color: "#737C77",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  loadingProgress: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF0EE",
  },

  loadingProgressText: {
    color: "#ED5447",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },

  loadingBarBg: {
    marginTop: 14,
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F3F2",
    overflow: "hidden",
  },

  loadingBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#ED5447",
  },
});