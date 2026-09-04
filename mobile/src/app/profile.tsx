import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  updateProfile,
  signOut,
} from "firebase/auth";
import * as ImagePicker from "expo-image-picker";

import {
  auth,
  db,
} from "../services/firebase";
import { api } from "../services/api";
import BottomNav from "../components/BottomNav";
import { uploadProfilePhoto } from "../services/uploadService";
import { deleteAccount } from "../services/accountService";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
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

  const [photo, setPhoto] =
    useState<string>(
      user?.photoURL || ""
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const avatarFallback =
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || user?.displayName || "User"
    )}&background=09A84E&color=fff&bold=true`;

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const snapshot = await getDoc(
        doc(db, "users", user.uid)
      );

      if (snapshot.exists()) {
        const data = snapshot.data();

        setName(
          data.name ||
            user.displayName ||
            ""
        );

        setCompany(
          data.company || ""
        );

        setDesignation(
          data.designation || ""
        );

        setPhone(
          data.phone || ""
        );

        setPhoto(
          data.photoURL ||
            user.photoURL ||
            ""
        );
      }
    } catch (error) {
      console.error(
        "Failed to load profile:",
        error
      );

      Alert.alert(
        "Unable to Load Profile",
        "Your profile information could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow photo access to choose a profile picture."
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (
        !result.canceled &&
        result.assets?.length > 0
      ) {
        setPhoto(
          result.assets[0].uri
        );
      }
    } catch (error) {
      console.error(
        "Image picker error:",
        error
      );

      Alert.alert(
        "Unable to Select Photo",
        "Please try selecting the image again."
      );
    }
  };

  const saveProfile = async () => {
    const cleanName = name.trim();

    if (!user || saving) {
      return;
    }

    if (!cleanName) {
      Alert.alert(
        "Name Required",
        "Please enter your full name."
      );

      return;
    }

    try {
      setSaving(true);

      let finalPhotoURL = photo;

      if (
        photo &&
        !photo.startsWith("http")
      ) {
        setUploading(true);
        finalPhotoURL =
          await uploadProfilePhoto(photo);
        setUploading(false);
        setPhoto(finalPhotoURL);
      }

      await updateProfile(user, {
        displayName: cleanName,
        photoURL:
          finalPhotoURL.startsWith("http")
            ? finalPhotoURL
            : user.photoURL || null,
      });

      await updateDoc(
        doc(db, "users", user.uid),
        {
          name: cleanName,
          company: company.trim(),
          designation:
            designation.trim(),
          phone: phone.trim(),
          photoURL: finalPhotoURL,
          updatedAt: Date.now(),
        }
      );

      setIsEditing(false);

      Alert.alert(
        "Profile Updated",
        "Your profile information was saved successfully."
      );
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      Alert.alert(
        "Update Failed",
        "Unable to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteAccount();
              await signOut(auth);
              router.replace("/login");
            } catch (error: any) {
              Alert.alert(
                "Delete Failed",
                error?.message || "Unable to delete account. Please try again."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderPage}>
        <ActivityIndicator
          size="large"
          color="#09A84E"
        />

        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom:
                  120 + insets.bottom,
              },
            ]}
          >
            {/* Header */}
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
                <Text style={styles.heading}>
                  Edit Profile
                </Text>

                <Text style={styles.subtitle}>
                  Manage your personal information
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.86}
                disabled={saving}
                style={[
                  isEditing
                    ? styles.headerSaveButton
                    : styles.headerEditButton,
                  saving && styles.disabledButton,
                ]}
                onPress={() => {
                  if (isEditing) {
                    saveProfile();
                  } else {
                    setIsEditing(true);
                  }
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        isEditing
                          ? "checkmark-circle-outline"
                          : "create-outline"
                      }
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.headerSaveText}>
                      {isEditing ? "Save" : "Edit Profile"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Profile Photo */}
            <View style={styles.profileCard}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={{
                    uri:
                      photo ||
                      avatarFallback,
                  }}
                  style={styles.avatar}
                />

                {isEditing ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={styles.cameraButton}
                    onPress={pickImage}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <Ionicons
                        name="camera"
                        size={18}
                        color="#FFFFFF"
                      />
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={styles.profileName}>
                {name.trim() ||
                  "Your Name"}
              </Text>

              <Text style={styles.profileEmail}>
                {user?.email ||
                  "No email available"}
              </Text>

              {isEditing ? (
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.changePhoto}
                    onPress={pickImage}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator
                        size="small"
                        color="#09A84E"
                      />
                    ) : (
                      <Ionicons
                        name="image-outline"
                        size={18}
                        color="#09A84E"
                      />
                    )}

                    <Text style={styles.changeText}>
                      {uploading
                        ? "Uploading..."
                        : "Change Photo"}
                    </Text>
                  </TouchableOpacity>

                  {photo ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.removePhoto}
                      onPress={() => {
                        Alert.alert(
                          "Remove Photo",
                          "Are you sure you want to remove your profile photo?",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Remove",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  setUploading(true);
                                  await api.post("/remove/profile-photo");
                                  setPhoto("");
                                  await updateProfile(user!, { photoURL: "" });
                                } catch {
                                  Alert.alert(
                                    "Error",
                                    "Failed to remove photo. Please try again."
                                  );
                                } finally {
                                  setUploading(false);
                                }
                              },
                            },
                          ]
                        );
                      }}
                      disabled={uploading}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#E34E4E"
                      />
                      <Text style={styles.removePhotoText}>
                        Remove Photo
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* Personal Information */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Personal Information
              </Text>

              <Text style={styles.sectionSubtitle}>
                Update your basic details
              </Text>
            </View>

            <View style={styles.formCard}>
              <ProfileInput
                label="Full Name"
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                autoCapitalize="words"
                editable={isEditing}
              />

              <View style={styles.divider} />

              <ProfileInput
                label="Email Address"
                icon="mail-outline"
                value={user?.email || ""}
                editable={false}
                placeholder="Email address"
              />

              <View style={styles.divider} />

              <ProfileInput
                label="Phone Number"
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 XXXXX XXXXX"
                keyboardType="phone-pad"
                editable={isEditing}
              />
            </View>

            {/* Work Information */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Work Information
              </Text>

              <Text style={styles.sectionSubtitle}>
                Add your professional details
              </Text>
            </View>

            <View style={styles.formCard}>
              <ProfileInput
                label="Company Name"
                icon="business-outline"
                value={company}
                onChangeText={setCompany}
                placeholder="Enter your company"
                autoCapitalize="words"
                editable={isEditing}
              />

              <View style={styles.divider} />

              <ProfileInput
                label="Job Title"
                icon="briefcase-outline"
                value={designation}
                onChangeText={setDesignation}
                placeholder="Founder, Manager, Designer..."
                autoCapitalize="words"
                editable={isEditing}
              />
            </View>

            {/* Delete Account */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              <View style={styles.deleteIcon}>
                {deleting ? (
                  <ActivityIndicator
                    size="small"
                    color="#E34E4E"
                  />
                ) : (
                  <Ionicons
                    name="trash-outline"
                    size={19}
                    color="#E34E4E"
                  />
                )}
              </View>

              <View style={styles.deleteInformation}>
                <Text style={styles.deleteText}>
                  Delete Account
                </Text>

                <Text style={styles.deleteDescription}>
                  Permanently remove your account and data
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#C2C7CB"
              />
            </TouchableOpacity>
          </ScrollView>

          <BottomNav active="settings" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ProfileInputProps = {
  label: string;
  icon:
    | "person-outline"
    | "mail-outline"
    | "call-outline"
    | "business-outline"
    | "briefcase-outline";
  value: string;
  placeholder: string;
  editable?: boolean;
  keyboardType?:
    | "default"
    | "phone-pad"
    | "email-address";
  autoCapitalize?:
    | "none"
    | "sentences"
    | "words"
    | "characters";
  onChangeText?: (
    value: string
  ) => void;
};

function ProfileInput({
  label,
  icon,
  value,
  placeholder,
  editable = true,
  keyboardType = "default",
  autoCapitalize = "none",
  onChangeText,
}: ProfileInputProps) {
  return (
    <View style={styles.inputRow}>
      <View
        style={[
          styles.inputIcon,
          !editable &&
            styles.disabledInputIcon,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            editable
              ? "#09A84E"
              : "#9AA1A7"
          }
        />
      </View>

      <View style={styles.inputContent}>
        <Text style={styles.label}>
          {label}
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={[
            styles.input,
            !editable &&
              styles.disabledInput,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#A3AAB0"
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          selectionColor="#09A84E"
        />
      </View>
    </View>
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

  keyboardContainer: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
  },

  header: {
    minHeight: 80,
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

  headerEditButton: {
    minWidth: 112,
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: "#09AA4D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#078A3E",
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  headerSaveButton: {
    minWidth: 82,
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: "#09AA4D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#078A3E",
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  headerSaveText: {
    marginLeft: 6,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  heading: {
    color: "#171C21",
    fontSize: 22,
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 4,
    color: "#858D95",
    fontSize: 12.5,
    fontWeight: "500",
  },

  profileCard: {
    marginTop: 10,
    minHeight: 231,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 23,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7ECE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.065,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  avatarWrapper: {
    position: "relative",
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#EAF8F0",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  cameraButton: {
    position: "absolute",
    right: -3,
    bottom: 1,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#09A84E",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  profileName: {
    marginTop: 13,
    color: "#20262C",
    fontSize: 17,
    fontWeight: "800",
  },

  profileEmail: {
    marginTop: 4,
    color: "#858D95",
    fontSize: 12.5,
    fontWeight: "500",
  },

  photoActionsRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  changePhoto: {
    minHeight: 39,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  changeText: {
    marginLeft: 7,
    color: "#09A84E",
    fontSize: 13,
    fontWeight: "800",
  },

  removePhoto: {
    minHeight: 39,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: "#FFF0F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  removePhotoText: {
    marginLeft: 7,
    color: "#E34E4E",
    fontSize: 13,
    fontWeight: "800",
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#171C21",
    fontSize: 17,
    fontWeight: "800",
  },

  sectionSubtitle: {
    marginTop: 4,
    color: "#858D95",
    fontSize: 12,
    fontWeight: "500",
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E7ECE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  inputRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  inputIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledInputIcon: {
    backgroundColor: "#F0F2F1",
  },

  inputContent: {
    flex: 1,
    marginLeft: 13,
  },

  label: {
    color: "#7C848B",
    fontSize: 11.5,
    fontWeight: "700",
  },

  input: {
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 0,
    color: "#20262C",
    fontSize: 15,
    fontWeight: "700",
  },

  disabledInput: {
    color: "#969DA3",
  },

  divider: {
    height: 1,
    marginLeft: 56,
    backgroundColor: "#EDF0EE",
  },

  disabledButton: {
    opacity: 0.72,
  },

  deleteButton: {
    minHeight: 73,
    marginTop: 14,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F4CDCD",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  deleteIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteInformation: {
    flex: 1,
    marginLeft: 12,
  },

  deleteText: {
    color: "#D94444",
    fontSize: 14,
    fontWeight: "800",
  },

  deleteDescription: {
    marginTop: 3,
    color: "#969DA3",
    fontSize: 11.5,
    fontWeight: "500",
  },
});