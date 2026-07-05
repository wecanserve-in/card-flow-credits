import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

import { useEffect, useState } from "react";

import { getContacts } from "../services/database";
import { exportContactsToExcel } from "../services/excelService";

export default function ExportScreen() {

  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    const data = await getContacts();
    setContacts(data);
  }

  // KEEP YOUR handleDownload()
const handleExport = async () => {
  try {
    if (contacts.length === 0) {
      Alert.alert(
        "No Contacts",
        "No saved contacts found."
      );
      return;
    }

    const fileUri = await exportContactsToExcel(contacts);

    if (!fileUri) {
      Alert.alert(
        "Error",
        "Failed to generate Excel."
      );
      return;
    }

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        "Sharing not available",
        "Sharing is not supported on this device."
      );
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Export Excel",
      UTI:
        "org.openxmlformats.spreadsheetml.sheet",
    });
  } catch (error) {
    console.log(error);

    Alert.alert(
      "Error",
      "Failed to export Excel."
    );
  }
};
  // KEEP YOUR handleShare()

  const totalEmails = contacts.filter(c => c.email).length;
  const totalPhones = contacts.filter(c => c.phone).length;

  const companies = new Set(
    contacts
      .map(c => c.company)
      .filter(Boolean)
  );

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:120
        }}
      >

        {/* Header */}

        <TouchableOpacity
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={28}
            color="#111827"
          />
        </TouchableOpacity>

     <Text style={styles.title}>
  Export Excel
</Text>
        <Text style={styles.subtitle}>
          Review your workbook before downloading.
        </Text>

        {/* Workbook */}

        <View style={styles.workbookCard}>

          <Ionicons
            name="document-text"
            color="#22C55E"
            size={50}
          />

          <View
            style={{
              flex:1,
              marginLeft:15,
            }}
          >
            <Text style={styles.fileName}>
              business_cards.xlsx
            </Text>

            <Text style={styles.fileType}>
              Microsoft Excel Workbook (.xlsx)
            </Text>
          </View>

        </View>

        {/* Stats */}

        <View style={styles.grid}>

          <View style={styles.statCard}>
            <Text style={styles.number}>
              {contacts.length}
            </Text>

            <Text style={styles.label}>
              Contacts
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.number}>
              {companies.size}
            </Text>

            <Text style={styles.label}>
              Companies
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.number}>
              {totalEmails}
            </Text>

            <Text style={styles.label}>
              Emails
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.number}>
              {totalPhones}
            </Text>

            <Text style={styles.label}>
              Phones
            </Text>
          </View>

        </View>

        {/* Preview */}

        <View style={styles.previewCard}>

          <Text style={styles.previewTitle}>
            Excel Preview
          </Text>
<View style={styles.tableHeader}>

  <Text style={[styles.headerCell, { flex: 1.3 }]}>
    Name
  </Text>

  <Text style={styles.headerCell}>
    Company
  </Text>

  <Text style={styles.headerCell}>
    Phone
  </Text>

</View>

{contacts.slice(0, 5).map((item, index) => (
  <View
    key={index}
    style={styles.tableRow}
  >

    <Text
      style={[styles.cell, { flex: 1.3 }]}
      numberOfLines={1}
    >
      {item.name || "-"}
    </Text>

    <Text
      style={styles.cell}
      numberOfLines={1}
    >
      {item.company || "-"}
    </Text>

    <Text
      style={styles.cell}
      numberOfLines={1}
    >
      {item.phone || "-"}
    </Text>

  </View>
))}

          {contacts.length>5 && (

            <Text style={styles.more}>
              +{contacts.length-5} more contacts...
            </Text>

          )}

        </View>

      </ScrollView>

      {/* Fixed Buttons */}

      <View style={styles.bottomActions}>

  <TouchableOpacity
    style={styles.downloadBtn}
onPress={handleExport}
  >
    <Ionicons
      name="share-outline"
      size={22}
      color="#fff"
    />

    <Text style={styles.downloadText}>
      Export Excel
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.shareBtn}
    onPress={() => router.back()}
  >
    <Ionicons
      name="arrow-back-outline"
      size={22}
      color="#111827"
    />

    <Text style={styles.shareText}>
      Back
    </Text>
  </TouchableOpacity>

</View>

    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8FC",
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
    marginTop: 18,
  },

  subtitle: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 15,
    marginBottom: 24,
  },

  workbookCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },

  fileName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  fileType: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 13,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 22,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: "center",
    marginBottom: 15,

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  number: {
    fontSize: 30,
    fontWeight: "900",
    color: "#5B4BFF",
  },

  label: {
    marginTop: 8,
    color: "#6B7280",
    fontWeight: "600",
  },

  previewCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 3,
  },

  previewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
  },

  headerCell: {
  flex: 1,
  fontWeight: "800",
  color: "#4338CA",
  fontSize: 13,
},

  tableRow: {
    flexDirection: "row",
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  cell: {
  flex: 1,
  color: "#374151",
  fontSize: 13,
},

  more: {
    marginTop: 14,
    textAlign: "center",
    color: "#5B4BFF",
    fontWeight: "700",
  },

  bottomActions: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 28,
  },

  downloadBtn: {
    height: 58,
    backgroundColor: "#22C55E",
    borderRadius: 18,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#22C55E",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 8,
  },

  downloadText: {
    color: "#FFFFFF",
    marginLeft: 10,
    fontWeight: "800",
    fontSize: 16,
  },

  shareBtn: {
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,

    marginTop: 14,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  shareText: {
    marginLeft: 10,
    fontWeight: "700",
    color: "#111827",
    fontSize: 15,
  },
});