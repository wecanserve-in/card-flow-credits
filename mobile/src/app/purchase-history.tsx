import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import BottomNav from "@/components/BottomNav";
import {
  getPaymentHistory,
  PurchaseRecord,
} from "../services/paymentService";


const PLAN_COLORS: Record<
  string,
  {
    primary: string;
    light: string;
  }
> = {
  personal_starter: {
    primary: "#0AA84F",
    light: "#EFFBF4",
  },
  personal_popular: {
    primary: "#F27522",
    light: "#FFF8F1",
  },
  personal_pro: {
    primary: "#7353B6",
    light: "#F9F6FF",
  },
  business_starter: {
    primary: "#2F80ED",
    light: "#F0F7FF",
  },
  business_pro: {
    primary: "#08998A",
    light: "#F0FBF9",
  },
  business_enterprise: {
    primary: "#E8590C",
    light: "#FFF6F0",
  },
};


export default function PurchaseHistoryScreen() {
  const insets = useSafeAreaInsets();

  const [payments, setPayments] =
    useState<PurchaseRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);


  const loadHistory =
    useCallback(async () => {
      try {
        setError(null);
        const data = await getPaymentHistory();
        setPayments(data);
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to load payment history."
        );
      }
    }, []);


  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await loadHistory();
      if (!cancelled) {
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [loadHistory]);


  const onRefresh =
    useCallback(async () => {
      setRefreshing(true);
      await loadHistory();
      setRefreshing(false);
    }, [loadHistory]);


  const formatPrice = (paise: number) => {
    return `₹${paise.toLocaleString("en-IN")}`;
  };


  const formatDate = (epochMs: number) => {
    if (!epochMs) return "";

    const date = new Date(epochMs);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  const formatTime = (epochMs: number) => {
    if (!epochMs) return "";

    const date = new Date(epochMs);

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };


  const totalSpent = payments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const totalScansAdded = payments.reduce(
    (sum, p) => sum + (p.creditsAdded || 0),
    0
  );


  if (loading) {
    return (
      <SafeAreaView style={styles.loaderPage}>
        <ActivityIndicator
          size="large"
          color="#09A84E"
        />

        <Text style={styles.loadingText}>
          Loading payment history...
        </Text>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#20262C"
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.heading}>
              Payment History
            </Text>

            <Text style={styles.headerSubtitle}>
              Your past purchases and transactions
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>


        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#09A84E"
              colors={["#09A84E"]}
            />
          }
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 120 + insets.bottom,
            },
          ]}
        >

          {/* Summary Cards */}
          {payments.length > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIcon,
                    { backgroundColor: "#EAF8F0" },
                  ]}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={22}
                    color="#09A84E"
                  />
                </View>

                <Text style={styles.summaryNumber}>
                  {payments.length}
                </Text>

                <Text style={styles.summaryLabel}>
                  Total Purchases
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIcon,
                    { backgroundColor: "#FFF5DE" },
                  ]}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={22}
                    color="#EFA300"
                  />
                </View>

                <Text style={styles.summaryNumber}>
                  {formatPrice(totalSpent)}
                </Text>

                <Text style={styles.summaryLabel}>
                  Total Spent
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIcon,
                    { backgroundColor: "#F1EDFF" },
                  ]}
                >
                  <Ionicons
                    name="scan-outline"
                    size={22}
                    color="#7056B8"
                  />
                </View>

                <Text style={styles.summaryNumber}>
                  {totalScansAdded}
                </Text>

                <Text style={styles.summaryLabel}>
                  Scans Added
                </Text>
              </View>
            </View>
          )}


          {/* Error State */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color="#E34E4E"
              />

              <Text style={styles.errorText}>
                {error}
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.retryButton}
                onPress={onRefresh}
              >
                <Text style={styles.retryText}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          )}


          {/* Empty State */}
          {!error && payments.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="card-outline"
                  size={52}
                  color="#B2B8BD"
                />
              </View>

              <Text style={styles.emptyTitle}>
                No purchases yet
              </Text>

              <Text style={styles.emptySubtitle}>
                When you buy a scan pack, your
                payment history will appear here.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.browseButton}
                onPress={() =>
                  router.push("/plans")
                }
              >
                <Text
                  style={styles.browseButtonText}
                >
                  Browse Plans
                </Text>
              </TouchableOpacity>
            </View>
          )}


          {/* Payment List */}
          {!error && payments.length > 0 && (
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>
                Recent Transactions
              </Text>

              <View style={styles.paymentList}>
                {payments.map((payment, index) => {
                  const colors =
                    PLAN_COLORS[payment.packId] ||
                    PLAN_COLORS.personal_starter;

                  return (
                    <View
                      key={
                        payment.paymentId ||
                        String(index)
                      }
                      style={[
                        styles.paymentCard,
                        index === payments.length - 1 &&
                          styles.lastPaymentCard,
                      ]}
                    >
                      <View
                        style={
                          styles.paymentTopRow
                        }
                      >
                        <View
                          style={
                            styles.paymentLeft
                          }
                        >
                          <View
                            style={[
                              styles.planBadge,
                              {
                                backgroundColor:
                                  colors.light,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.planBadgeText,
                                {
                                  color:
                                    colors.primary,
                                },
                              ]}
                            >
                              {payment.packName}
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.paymentDate
                            }
                          >
                            {formatDate(
                              payment.processedAt
                            )}
                            {"  "}
                            {formatTime(
                              payment.processedAt
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.paymentRight
                          }
                        >
                          <Text
                            style={
                              styles.paymentAmount
                            }
                          >
                            {formatPrice(
                              payment.amount
                            )}
                          </Text>
                        </View>
                      </View>


                      <View
                        style={
                          styles.paymentDetails
                        }
                      >
                        <View
                          style={
                            styles.detailItem
                          }
                        >
                          <Ionicons
                            name="scan-outline"
                            size={14}
                            color="#858D95"
                          />

                          <Text
                            style={
                              styles.detailText
                            }
                          >
                            {payment.creditsAdded}{" "}
                            scans added
                          </Text>
                        </View>

                        <View
                          style={
                            styles.detailItem
                          }
                        >
                          <Ionicons
                            name="finger-print-outline"
                            size={14}
                            color="#858D95"
                          />

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.detailText,
                              styles.paymentIdText,
                            ]}
                          >
                            {payment.paymentId}
                          </Text>
                        </View>
                      </View>

                    </View>
                  );
                })}
              </View>
            </View>
          )}

        </ScrollView>

        <BottomNav active="settings" />

      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  loaderPage: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#858D95",
    fontSize: 13,
    fontWeight: "500",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },

  header: {
    minHeight: 80,
    paddingHorizontal: 19,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EFF1F2",
  },

  backButton: {
    width: 42,
    height: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    marginLeft: 2,
  },

  headerSpacer: {
    width: 42,
  },

  heading: {
    color: "#20242A",
    fontSize: 21,
    fontWeight: "800",
  },

  headerSubtitle: {
    marginTop: 3,
    color: "#8A9097",
    fontSize: 13,
    fontWeight: "500",
  },

  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7ECE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryNumber: {
    marginTop: 10,
    color: "#1B2127",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },

  summaryLabel: {
    marginTop: 4,
    color: "#858D95",
    fontSize: 10.5,
    fontWeight: "600",
    textAlign: "center",
  },

  errorContainer: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 30,
  },

  errorText: {
    marginTop: 14,
    color: "#6F767E",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 21,
  },

  retryButton: {
    marginTop: 20,
    minWidth: 120,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  retryText: {
    color: "#09A84E",
    fontSize: 14,
    fontWeight: "700",
  },

  emptyContainer: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F3F5F4",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 20,
    color: "#20262C",
    fontSize: 18,
    fontWeight: "800",
  },

  emptySubtitle: {
    marginTop: 8,
    color: "#858D95",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },

  browseButton: {
    marginTop: 24,
    minWidth: 160,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#09AF4C",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#138A3C",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },

  browseButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  listSection: {
    marginTop: 24,
  },

  sectionTitle: {
    color: "#171C21",
    fontSize: 17,
    fontWeight: "800",
  },

  paymentList: {
    marginTop: 14,
    gap: 12,
  },

  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderWidth: 1,
    borderColor: "#E7ECE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  lastPaymentCard: {},

  paymentTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  paymentLeft: {
    flex: 1,
    paddingRight: 12,
  },

  planBadge: {
    alignSelf: "flex-start",
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  planBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  paymentDate: {
    marginTop: 10,
    color: "#717980",
    fontSize: 12,
    fontWeight: "500",
  },

  paymentRight: {
    alignItems: "flex-end",
  },

  paymentAmount: {
    color: "#1B2127",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  paymentDetails: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F1",
    paddingTop: 12,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  detailText: {
    color: "#858D95",
    fontSize: 11.5,
    fontWeight: "500",
  },

  paymentIdText: {
    maxWidth: 160,
  },
});
