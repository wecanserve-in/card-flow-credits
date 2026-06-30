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

import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";
import { uploadCards } from "../services/scanService";

export default function ScannedQueueScreen() {
const scannedImages =
  (globalThis as any).scannedImages || [];

const [selectedCards, setSelectedCards] = useState<number[]>(
  scannedImages.map((_: any, index: number) => index)
);

const [loading, setLoading] = useState(false);

 const handleExtract = async () => {
  if (selectedCards.length === 0) {
    Alert.alert(
      "No Cards Selected",
      "Please select at least one card."
    );
    return;
  }

  try {
    setLoading(true);

    const selectedImages = scannedImages.filter(
      (_: string, index: number) =>
        selectedCards.includes(index)
    );

    console.log("Selected Images:", selectedImages);

    const result = await uploadCards(selectedImages);

    console.log("API Result:", result);

    (globalThis as any).extractedCards =
      result.cards;

    router.push("/contacts");
  } catch (error) {
    console.log("Extraction Error:", error);

    Alert.alert(
      "Error",
      "Failed to extract card details."
    );
  } finally {
    setLoading(false);
  }
};

  const toggleCard = (index: number) => {
  if (selectedCards.includes(index)) {
    setSelectedCards(
      selectedCards.filter((item) => item !== index)
    );
  } else {
    setSelectedCards([...selectedCards, index]);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Scanned Cards</Text>
          <Text style={styles.subtitle}>
            Review before extracting
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {scannedImages.length}
          </Text>
        </View>
      </View>

      {/* Grid */}

      <FlatList
        data={scannedImages}
        numColumns={3}
        keyExtractor={(_, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
    renderItem={({ item, index }) => (
  <TouchableOpacity
    style={[
      styles.cardContainer,
      !selectedCards.includes(index) && styles.unselectedCard,
    ]}
    onPress={() => toggleCard(index)}
    activeOpacity={0.8}
  >
  <Image
  source={{ uri: item }}
  style={styles.cardImage}
  resizeMode="cover"
/>


   {selectedCards.includes(index) && (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>
      {index + 1}
    </Text>
  </View>
)}
</TouchableOpacity>
)}
      />

      {/* Bottom Buttons */}

      <View style={styles.bottomContainer}>
        <TouchableOpacity
  style={[
    styles.extractButton,
    loading && styles.disabledButton,
  ]}
  onPress={handleExtract}
  disabled={loading}
>
       <Text style={styles.extractText}>
  Extract Selected ({selectedCards.length} Cards)
</Text>
        </TouchableOpacity>

       <TouchableOpacity
  onPress={() => {
    (globalThis as any).scannedImages = [];
    router.back();
  }}
>
          <Text style={styles.clearText}>
            Clear All
          </Text>
        </TouchableOpacity>
      </View>

     {loading && (
  <View style={styles.loadingOverlay}>
    <View style={styles.loadingCard}>
      <ActivityIndicator
        size="large"
        color="#3B5BFF"
      />

    <Text style={styles.loadingTitle}>
  Processing Cards
</Text>

<Text style={styles.loadingSubtitle}>
  Our AI is extracting contact details.
  Please wait a few seconds.
</Text>
    </View>
  </View>
)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },

  back: {
    fontSize: 28,
    color: "#111827",
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  countBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  countText: {
    fontWeight: "700",
    fontSize: 16,
  },

  cardContainer: {
    width: "31%",
    margin: "1.1%",
    borderRadius: 14,
    overflow: "hidden",
  },

  cardImage: {
    width: "100%",
    height: 100,
    borderRadius: 14,
  },

  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#3B5BFF",
    justifyContent: "center",
    alignItems: "center",
  },

  badgeText: {
    color: "#fff",
    fontWeight: "700",
  },

  bottomContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },

 extractButton: {
  height: 56,
  borderRadius: 16,
  backgroundColor: "#3B5BFF",
  justifyContent: "center",
  alignItems: "center",
  flexDirection: "row",
},

  extractText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  clearText: {
    textAlign: "center",
    color: "#FF4D67",
    fontWeight: "700",
    marginTop: 18,
    fontSize: 15,
  },

  unselectedCard: {
  opacity: 0.35,
},
disabledButton: {
  opacity: 0.7,
},
loadingOverlay: {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "rgba(0,0,0,0.45)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
},

loadingCard: {
  width: "85%",
   maxWidth: 340,
  backgroundColor: "#fff",
  borderRadius: 28,
  paddingVertical: 35,
  paddingHorizontal: 25,
  alignItems: "center",
  justifyContent: "center",
  elevation: 8,
  shadowColor: "#000",
shadowOpacity: 0.15,
shadowRadius: 20,
shadowOffset: {
  width: 0,
  height: 8,},
},

loadingTitle: {
  marginTop: 18,
  fontSize: 20,
  fontWeight: "800",
  color: "#111827",
},

loadingSubtitle: {
  marginTop: 8,
  textAlign: "center",
  color: "#6B7280",
},

});