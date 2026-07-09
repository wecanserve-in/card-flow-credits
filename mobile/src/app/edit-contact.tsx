import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

export default function EditContact() {
  const { index } = useLocalSearchParams();

  const contact =
    (globalThis as any).extractedCards?.[Number(index)] || {};

  const [form, setForm] = useState({
    name: contact.name || "",
    company: contact.company || "",
    designation: contact.designation || "",
    phone: contact.phone || "",
    email: contact.email || "",
    website: contact.website || "",
    address: contact.address || "",
    country: contact.country || "",
  });

  const handleChange = (
    key: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveChanges = () => {
  if (!form.name.trim()) {
    Alert.alert("Validation", "Name cannot be empty.");
    return;
  }

  const cards = [...((globalThis as any).extractedCards || [])];

  cards[Number(index)] = {
    ...cards[Number(index)],
    ...form,
  };

  (globalThis as any).extractedCards = cards;

  router.back();
};

  const renderInput = (
    label: string,
    key: keyof typeof form,
    placeholder: string,
    keyboardType: any = "default"
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={form[key]}
        placeholder={placeholder}
        keyboardType={keyboardType}
        onChangeText={(text) => handleChange(key, text)}
        style={styles.input}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons
                name="arrow-back"
                size={26}
                color="#111827"
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              Edit Contact
            </Text>

            <View style={{ width: 26 }} />
          </View>

          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(form.name.charAt(0) || "?").toUpperCase()}
            </Text>
          </View>

          {/* Form */}
          {renderInput("Full Name", "name", "John Doe")}

          {renderInput(
            "Company",
            "company",
            "Google"
          )}

          {renderInput(
            "Designation",
            "designation",
            "Software Engineer"
          )}

          {renderInput(
            "Phone",
            "phone",
            "+91 9876543210",
            "phone-pad"
          )}

          {renderInput(
            "Email",
            "email",
            "example@gmail.com",
            "email-address"
          )}

          {renderInput(
            "Website",
            "website",
            "www.example.com"
          )}

          {renderInput(
            "Address",
            "address",
            "Mumbai"
          )}

          {renderInput(
            "Country",
            "country",
            "India"
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveChanges}
          >
            <Ionicons
              name="save-outline"
              size={22}
              color="#fff"
            />

            <Text style={styles.saveText}>
              Save Changes
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 28,
    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },

  avatarText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
  },

  inputContainer: {
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: "#111827",

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  saveButton: {
    height: 58,
    backgroundColor: "#2563EB",
    borderRadius: 18,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    marginTop: 24,
    marginBottom: 40,

    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },

  saveText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginLeft: 10,
  },
});