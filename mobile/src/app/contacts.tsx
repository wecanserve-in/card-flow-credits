import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert, // add this
} from "react-native";




import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import  BottomNav from "@/components/BottomNav";
import { saveContacts } from "../services/database";
import { router, useFocusEffect } from "expo-router";

export default function ContactsScreen() {
  const [search, setSearch] = useState("");

const [contacts, setContacts] = useState<any[]>([]);

useFocusEffect(
  React.useCallback(() => {
    setContacts(
      Array.isArray((globalThis as any).extractedCards)
        ? [...(globalThis as any).extractedCards]
        : []
    );
  }, [])
);

const filteredContacts = (contacts || []).filter(
  (contact: any) =>
    (contact.name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
);
  console.log("Contacts:", contacts);
console.log("Filtered:", filteredContacts);

  return (
   <SafeAreaView style={styles.container}>

  {/* Header */}
  <View style={styles.header}>
      <Text style={styles.title}>
        Extracted Contacts
      </Text>

      <Text style={styles.subtitle}>
        {contacts.length} contacts found
      </Text>
  </View>

  {/* Search */}

  <View style={styles.searchContainer}>
      <Ionicons
        name="search"
        size={20}
        color="#9CA3AF"
      />

     <TextInput
  placeholder="Search contacts"
  style={styles.searchInput}
  value={search}
  onChangeText={setSearch}
/>

      <TouchableOpacity>
        <Ionicons
          name="options-outline"
          size={22}
          color="#2563EB"
        />
      </TouchableOpacity>
  </View>

  {/* Contact List */}


<FlatList
  data={filteredContacts || []}
keyExtractor={(item, index) =>
  `${item.filename || item.card_no || "card"}-${index}`
}
      contentContainerStyle={{
        paddingBottom: 160,
      }}
    renderItem={({ item, index }) => (
        <View style={styles.card}>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
  {(item.name?.charAt(0) || "?").toUpperCase()}
</Text>
          </View>

          <View style={styles.info}>
  <Text style={styles.name}>
    {item.name || "Unknown Contact"}
  </Text>

  <Text style={styles.designation}>
    {item.designation || "No Designation"}
    {item.company ? ` • ${item.company}` : ""}
  </Text>

  {item.phone ? (
    <Text style={styles.phone}>
      📞 {item.phone}
    </Text>
  ) : null}

  {item.email ? (
    <Text style={styles.email}>
      ✉️ {item.email}
    </Text>
  ) : null}

  {item.website ? (
    <Text style={styles.website}>
      🌐 {item.website}
    </Text>
  ) : null}

  {item.address ? (
    <Text style={styles.address}>
      📍 {item.address}
      {item.country ? `, ${item.country}` : ""}
    </Text>
  ) : null}
</View>

       <TouchableOpacity
  onPress={() =>
    router.push({
      pathname: "/edit-contact",
      params: {
        index: index.toString(),
      },
    })
  }
>
  <Ionicons
    name="create-outline"
    size={24}
    color="#2563EB"
  />
</TouchableOpacity>

        </View>
      )}
  />

  {/* Save Button */}

  <View style={styles.bottomAction}>
     <TouchableOpacity
  style={styles.saveButton}

onPress={async () => {
  try {
    console.log("Saving Contacts...");
    console.log(contacts);

    await saveContacts(contacts);

    (globalThis as any).extractedCards = [];
    setContacts([]);

    Alert.alert(
      "Saved",
      `${contacts.length} contacts saved successfully.`,
      [
        {
          text: "OK",
          onPress: () => router.replace("/home"),
        },
      ]
    );
  } catch (error: any) {
  console.log(error);

  Alert.alert(
    "Save Failed",
    error?.message || JSON.stringify(error)
  );
}

(globalThis as any).extractedCards = [];

Alert.alert(
  "Saved",
  `${contacts.length} contacts saved on your device.`,
  [
    {
      text: "OK",
      onPress: () => router.push("/home"),
    },
  ]
);
}}>
          <Ionicons
            name="save-outline"
            size={22}
            color="#fff"
          />

          <Text style={styles.saveText}>
            Save All ({contacts.length})
          </Text>
      </TouchableOpacity>
  </View>

 <BottomNav active="contacts" />

</SafeAreaView>
  );
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: "#F8FAFC",
  paddingHorizontal: 16,
},

header: {
  marginTop: 12,
  marginBottom: 18,
},

title: {
  fontSize: 28,
  fontWeight: "800",
  color: "#07122F",
},

subtitle: {
  color: "#6B7280",
  marginTop: 4,
},

searchContainer: {
  height: 56,
  borderRadius: 18,
  backgroundColor: "#FFFFFF",
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  marginBottom: 18,

  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
},

searchInput: {
  flex: 1,
  marginHorizontal: 10,
  fontSize: 15,
},

card: {
  flexDirection: "row",
  alignItems: "center",

  backgroundColor: "#FFFFFF",
  borderRadius: 22,

  padding: 16,
  marginBottom: 14,

  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
},

avatar: {
  width: 56,
  height: 56,
  borderRadius: 28,

  backgroundColor: "#EEF4FF",

  justifyContent: "center",
  alignItems: "center",
},

avatarText: {
  color: "#2563EB",
  fontSize: 22,
  fontWeight: "800",
},

info: {
  flex: 1,
  marginLeft: 14,
},

name: {
  fontSize: 17,
  fontWeight: "700",
  color: "#111827",
},

designation: {
  marginTop: 3,
  color: "#6B7280",
},

phone: {
  marginTop: 8,
  color: "#2563EB",
  fontWeight: "600",
},

email: {
  marginTop: 3,
  color: "#374151",
},

bottomAction: {
  position: "absolute",
  left: 16,
  right: 16,
  bottom: 90, // navbar ke upar
},

saveButton: {
  height: 58,
  borderRadius: 18,

  backgroundColor: "#2563EB",

  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
},

saveText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "800",
  marginLeft: 10,
},
website: {
  marginTop: 3,
  color: "#374151",
  fontSize: 13,
},

address: {
  marginTop: 4,
  color: "#6B7280",
  fontSize: 13,
  lineHeight: 18,
},
});