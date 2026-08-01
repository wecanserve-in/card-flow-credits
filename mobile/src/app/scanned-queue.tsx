import React, {
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  doc,
  increment,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import { User } from "../types/user";
import { uploadCards } from "../services/scanService";
import {
  auth,
  db,
} from "../services/firebase";
import {
  createCreditNotification,
  createNotification,
} from "../services/notificationService";

export default function ScannedQueueScreen() {
  const insets = useSafeAreaInsets();

  const scannedImages: string[] =
    (globalThis as any).scannedImages || [];

  const [
    selectedCards,
    setSelectedCards,
  ] = useState<number[]>(
    scannedImages.map(
      (_: string, index: number) =>
        index
    )
  );

  const [loading, setLoading] =
    useState(false);

  const [userData, setUserData] =
    useState<User | null>(null);

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

  const toggleCard = (
    index: number
  ) => {
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
  };

  const selectAllCards = () => {
    if (
      selectedCards.length ===
      scannedImages.length
    ) {
      setSelectedCards([]);
      return;
    }

    setSelectedCards(
      scannedImages.map(
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
        scannedImages.filter(
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

      console.log(
        "Selected Images:",
        selectedImages
      );

      const result =
        await uploadCards(
          selectedImages
        );

      console.log(
        "API Result:",
        result
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

        Alert.alert(
          "No Details Found",
          "No readable card details were found. Please scan the cards again."
        );

        return;
      }

      const newUsed =
        currentUsed +
        extractedCards.length;

      const newRemaining =
        Math.max(
          totalLimit - newUsed,
          0
        );

      await updateDoc(
  doc(db, "users", auth.currentUser.uid),
  {
    usedScans: increment(extractedCards.length),
    remainingScans: increment(-extractedCards.length),
    updatedAt: Date.now(),
  }
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

      await createCreditNotification({
        remaining: newRemaining,
        used: newUsed,
        total: totalLimit,
      });

      (
        globalThis as any
      ).extractedCards =
        extractedCards;

      router.push("/contacts");
    } catch (error) {
      console.log(
        "Extraction Error:",
        error
      );

      await createNotification({
        type: "extraction_failed",
        title: "Extraction failed",
        message:
          "We could not extract the selected business cards. Please try again.",
        actionRoute: "/scanner",
        eventKey:
          `extraction-failed-${Date.now()}`,
      });

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

            router.back();
          },
        },
      ]
    );
  };

  const remainingScans =
  userData?.remainingScans ??
  Math.max(
    (userData?.totalScans ?? 0) -
      (userData?.usedScans ?? 0),
    0
  );

  const allSelected =
    scannedImages.length > 0 &&
    selectedCards.length ===
      scannedImages.length;

  const renderCard = ({
    item,
    index,
  }: {
    item: string;
    index: number;
  }) => {
    const selected =
      selectedCards.includes(index);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={[
          styles.cardContainer,
          !selected &&
            styles.unselectedCard,
        ]}
        onPress={() =>
          toggleCard(index)
        }
      >
        <Image
          source={{ uri: item }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        <View
          style={[
            styles.imageOverlay,
            selected &&
              styles.selectedOverlay,
          ]}
        />

        <View
          style={[
            styles.selectionButton,
            selected &&
              styles.selectionButtonActive,
          ]}
        >
          {selected ? (
            <Ionicons
              name="checkmark"
              size={15}
              color="#FFFFFF"
            />
          ) : (
            <View
              style={
                styles.unselectedCircle
              }
            />
          )}
        </View>

        <View style={styles.cardNumber}>
          <Text
            style={styles.cardNumberText}
          >
            Card {index + 1}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
              {scannedImages.length}
            </Text>
          </View>
        </View>

        {scannedImages.length > 0 ? (
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
                  color="#09A84E"
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
                    scannedImages.length
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

        <FlatList
          data={scannedImages}
          numColumns={2}
          keyExtractor={(
            _,
            index
          ) => index.toString()}
          renderItem={renderCard}
          showsVerticalScrollIndicator={
            false
          }
          columnWrapperStyle={
            styles.gridRow
          }
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                150 + insets.bottom,
            },
            scannedImages.length ===
              0 &&
              styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View
              style={styles.emptyState}
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name="scan-outline"
                  size={40}
                  color="#09A84E"
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No cards scanned
              </Text>

              <Text
                style={styles.emptyText}
              >
                Scan a business card first,
                then return here to review
                and extract its details.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={
                  styles.scanButton
                }
                onPress={() =>
                  router.back()
                }
              >
                <Ionicons
                  name="camera-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.scanButtonText
                  }
                >
                  Open Scanner
                </Text>
              </TouchableOpacity>
            </View>
          }
        />

        {scannedImages.length > 0 && (
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

        {loading && (
          <View
            style={
              styles.loadingOverlay
            }
          >
            <View
              style={styles.loadingCard}
            >
              <View
                style={
                  styles.loadingIcon
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#09A84E"
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
                  styles.loadingStatus
                }
              >
                <View
                  style={
                    styles.loadingDot
                  }
                />

                <Text
                  style={
                    styles.loadingStatusText
                  }
                >
                  Extracting{" "}
                  {selectedCards.length}{" "}
                  {selectedCards.length ===
                  1
                    ? "card"
                    : "cards"}
                </Text>
              </View>
            </View>
          </View>
        )}
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
    backgroundColor: "#EAF8F0",
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
    backgroundColor: "#EFF9F3",
    borderWidth: 1,
    borderColor: "#DBF1E4",
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
    color: "#078E42",
    fontSize: 18,
    fontWeight: "900",
  },

  limitValue: {
    color: "#E05252",
  },

  usageDivider: {
    width: 1,
    height: 35,
    backgroundColor: "#D2EADC",
  },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
  },

  gridRow: {
    justifyContent: "space-between",
  },

  cardContainer: {
    width: "48.5%",
    aspectRatio: 1.55,
    marginBottom: 12,
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
    ...StyleSheet.absoluteFillObject,
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(13, 19, 16, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
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
    backgroundColor: "#EAF8F0",
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

  loadingStatus: {
    minHeight: 36,
    marginTop: 18,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: "#EAF8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#09A84E",
  },

  loadingStatusText: {
    marginLeft: 7,
    color: "#078E42",
    fontSize: 11.5,
    fontWeight: "800",
  },
});