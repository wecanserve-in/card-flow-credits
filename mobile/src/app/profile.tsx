import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import * as ImagePicker from "expo-image-picker";

import {
  auth,
} from "../services/firebase";

import {
  updateProfile,
} from "firebase/auth";

import BottomNav from "../components/BottomNav";

export default function ProfileScreen() {
  const user = auth.currentUser;

  const [name, setName] = useState(
    user?.displayName || ""
  );

  const [company, setCompany] =
    useState("");

  const [designation, setDesignation] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [photo, setPhoto] = useState(
    user?.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user?.displayName || "User"
      )}&background=5B4BFF&color=fff`
  );

  const pickImage = async () => {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const saveProfile = async () => {
  try {
    if (!user) return;

    // Update Firebase Auth
    await updateProfile(user, {
      displayName: name,
    });

    // Update Firestore
    await updateDoc(doc(db, "users", user.uid), {
      name: name,
      company: company,
      designation: designation,
      phone: phone,
      updatedAt: Date.now(),
    });

    Alert.alert(
      "Success",
      "Profile updated successfully."
    );

    router.back();
  } catch (e) {
    console.log(e);

    Alert.alert(
      "Error",
      "Unable to update profile."
    );
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
      >
        {/* Header */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#111827"
            />
          </TouchableOpacity>

          <Text style={styles.heading}>
            Edit Profile
          </Text>

          <View style={{ width: 42 }} />
        </View>

        <Text style={styles.subtitle}>
          Manage your personal information
        </Text>

        {/* Profile */}

        <View style={styles.profileCard}>
          <Image
            source={{
              uri: photo,
            }}
            style={styles.avatar}
          />

          <TouchableOpacity
            style={styles.changePhoto}
            onPress={pickImage}
          >
            <Ionicons
              name="camera"
              size={18}
              color="#5B4BFF"
            />

            <Text style={styles.changeText}>
              Change Photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Full Name */}

        <View style={styles.inputCard}>
          <Text style={styles.label}>
            Full Name
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Enter your name"
          />
        </View>

        {/* Email */}

        <View style={styles.inputCard}>
          <Text style={styles.label}>
            Email Address
          </Text>

          <TextInput
            editable={false}
            value={user?.email || ""}
            style={[
              styles.input,
              {
                color: "#9CA3AF",
              },
            ]}
          />
        </View>

        {/* Phone */}

        <View style={styles.inputCard}>
          <Text style={styles.label}>
            Phone Number
          </Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="+91 XXXXX XXXXX"
          />
        </View>

        {/* Company */}

        <View style={styles.inputCard}>
          <Text style={styles.label}>
            Company Name
          </Text>

          <TextInput
            value={company}
            onChangeText={setCompany}
            style={styles.input}
            placeholder="Company"
          />
        </View>

        {/* Designation */}

        <View style={styles.inputCard}>
          <Text style={styles.label}>
            Job Title
          </Text>

          <TextInput
            value={designation}
            onChangeText={setDesignation}
            style={styles.input}
            placeholder="Founder, Manager..."
          />
        </View>

        {/* Save */}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveProfile}
        >
          <Ionicons
            name="checkmark-circle"
            size={22}
            color="#fff"
          />

          <Text style={styles.saveText}>
            Save Changes
          </Text>
        </TouchableOpacity>

        {/* Delete */}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() =>
            Alert.alert(
              "Delete Account",
              "This feature will be available soon."
            )
          }
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color="#EF4444"
          />

          <Text style={styles.deleteText}>
            Delete Account
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav active="settings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 24,
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 26,
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#EEF2FF",
  },

  changePhoto: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#EEF2FF",

    paddingHorizontal: 18,
    paddingVertical: 10,

    borderRadius: 999,
  },

  changeText: {
    marginLeft: 8,
    color: "#5B4BFF",
    fontWeight: "700",
    fontSize: 14,
  },

  inputCard: {
    marginTop: 18,

    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    paddingHorizontal: 18,
    paddingVertical: 16,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  label: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "600",
  },

  input: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    paddingVertical: 4,
  },

  saveButton: {
    marginTop: 30,

    height: 56,

    backgroundColor: "#5B4BFF",

    borderRadius: 18,

    justifyContent: "center",
    alignItems: "center",

    flexDirection: "row",

    shadowColor: "#5B4BFF",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },

  deleteButton: {
    marginTop: 16,
    marginBottom: 12,

    height: 54,

    borderRadius: 18,

    borderWidth: 1,
    borderColor: "#FCA5A5",

    backgroundColor: "#FFFFFF",

    justifyContent: "center",
    alignItems: "center",

    flexDirection: "row",
  },

  deleteText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 10,
  },
});