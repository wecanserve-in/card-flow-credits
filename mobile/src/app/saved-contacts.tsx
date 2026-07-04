import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getContacts } from "../services/database";

export default function SavedContactsScreen() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] =
    useState<any[]>([]);

  const [search, setSearch] = useState("");

  const [sortType, setSortType] =
    useState<"latest" | "oldest">("latest");

  useFocusEffect(
  useCallback(() => {
    loadContacts();
  }, [])
);

  useEffect(() => {
    filterContacts();
  }, [search, contacts, sortType]);

const loadContacts = async () => {
  const data = await getContacts();

  data.sort(
    (a: any, b: any) =>
      (b.updatedAt || 0) - (a.updatedAt || 0)
  );

  setContacts(data);
};

 const filterContacts = () => {
  let data = [...contacts];

  if (search.trim()) {
    const keyword = search.toLowerCase();

    data = data.filter((item) =>
      (item.name || "")
        .toLowerCase()
        .includes(keyword) ||

      (item.company || "")
        .toLowerCase()
        .includes(keyword) ||

      String(item.phone || "")
        .toLowerCase()
        .includes(keyword)
    );
  }

 if (sortType === "oldest") {
  data.reverse();
}

  setFilteredContacts(data);
};

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        Saved Contacts
      </Text>

      <Text style={styles.subtitle}>
        {filteredContacts.length} contacts
      </Text>

      {/* Search */}

      <View style={styles.searchBox}>
        <Ionicons
          name="search"
          size={20}
          color="#9CA3AF"
        />

        <TextInput
          placeholder="Search contacts..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Sort */}

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            sortType === "latest" &&
              styles.activeFilter,
          ]}
          onPress={() => setSortType("latest")}
        >
          <Text
            style={[
              styles.filterText,
              sortType === "latest" &&
                styles.activeFilterText,
            ]}
          >
            Latest
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            sortType === "oldest" &&
              styles.activeFilter,
          ]}
          onPress={() => setSortType("oldest")}
        >
          <Text
            style={[
              styles.filterText,
              sortType === "oldest" &&
                styles.activeFilterText,
            ]}
          >
            Oldest
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}

      <FlatList
        data={filteredContacts}
     keyExtractor={(item, index) =>
  item.id || `${item.email}-${index}`
}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
     renderItem={({ item }) => (
  <TouchableOpacity
    style={styles.card}
    activeOpacity={0.8}
    onPress={() => {
      (globalThis as any).selectedContact = item;
      router.push("/contact-details");
    }}
  >
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>
        {(item.name?.charAt(0) || "?").toUpperCase()}
      </Text>
    </View>

    <View style={styles.info}>
      <Text style={styles.name}>
        {item.name || "Unknown"}
      </Text>

      <Text style={styles.designation}>
        {item.designation || "No Designation"}
        {item.company
          ? ` • ${item.company}`
          : ""}
      </Text>

      {!!item.phone && (
        <Text style={styles.meta}>
          📞 {item.phone}
        </Text>
      )}

      {!!item.email && (
        <Text style={styles.meta}>
          ✉️ {item.email}
        </Text>
      )}
    </View>
  </TouchableOpacity>
)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
  },

  subtitle: {
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 20,
  },

  searchBox: {
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
  },

  filterRow: {
    flexDirection: "row",
    marginBottom: 18,
  },

  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 10,
  },

  activeFilter: {
    backgroundColor: "#2563EB",
  },

  filterText: {
    color: "#111827",
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#fff",
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
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
    color: "#6B7280",
    marginTop: 4,
  },

  meta: {
    color: "#374151",
    marginTop: 6,
  },
});