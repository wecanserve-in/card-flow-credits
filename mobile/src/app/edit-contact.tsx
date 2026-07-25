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
  KeyboardTypeOptions,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useLocalSearchParams,
} from "expo-router";

type ContactForm = {
  name: string;
  company: string;
  designation: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  country: string;
};

type InputConfig = {
  label: string;
  key: keyof ContactForm;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
};

export default function EditContact() {
  const insets = useSafeAreaInsets();
  const { index } = useLocalSearchParams();

  const contactIndex = Number(index);

  const contact =
    (globalThis as any).extractedCards?.[
      contactIndex
    ] || {};

  const [form, setForm] =
    useState<ContactForm>({
      name: contact.name || "",
      company: contact.company || "",
      designation:
        contact.designation || "",
      phone: contact.phone || "",
      email: contact.email || "",
      website: contact.website || "",
      address: contact.address || "",
      country: contact.country || "",
    });

  const handleChange = (
    key: keyof ContactForm,
    value: string
  ) => {
    setForm((previousForm) => ({
      ...previousForm,
      [key]: value,
    }));
  };

  const saveChanges = () => {
    if (!form.name.trim()) {
      Alert.alert(
        "Name Required",
        "Please enter the contact's name."
      );
      return;
    }

    const cards = [
      ...((globalThis as any)
        .extractedCards || []),
    ];

    cards[contactIndex] = {
      ...cards[contactIndex],
      ...form,
      name: form.name.trim(),
    };

    (globalThis as any).extractedCards =
      cards;

    router.back();
  };

  const inputConfigs: InputConfig[] = [
    {
      label: "Full Name",
      key: "name",
      placeholder: "Enter full name",
      icon: "person-outline",
      autoCapitalize: "words",
    },
    {
      label: "Company",
      key: "company",
      placeholder: "Enter company name",
      icon: "business-outline",
      autoCapitalize: "words",
    },
    {
      label: "Designation",
      key: "designation",
      placeholder: "Enter designation",
      icon: "briefcase-outline",
      autoCapitalize: "words",
    },
    {
      label: "Phone Number",
      key: "phone",
      placeholder: "+91 98765 43210",
      icon: "call-outline",
      keyboardType: "phone-pad",
      autoCapitalize: "none",
    },
    {
      label: "Email Address",
      key: "email",
      placeholder: "name@example.com",
      icon: "mail-outline",
      keyboardType: "email-address",
      autoCapitalize: "none",
    },
    {
      label: "Website",
      key: "website",
      placeholder: "www.example.com",
      icon: "globe-outline",
      keyboardType: "url",
      autoCapitalize: "none",
    },
    {
      label: "Address",
      key: "address",
      placeholder: "Enter complete address",
      icon: "location-outline",
      autoCapitalize: "sentences",
      multiline: true,
    },
    {
      label: "Country",
      key: "country",
      placeholder: "Enter country",
      icon: "flag-outline",
      autoCapitalize: "words",
    },
  ];

  const renderInput = (
    config: InputConfig
  ) => {
    const {
      label,
      key,
      placeholder,
      icon,
      keyboardType = "default",
      autoCapitalize = "sentences",
      multiline = false,
    } = config;

    return (
      <View
        key={key}
        style={styles.inputGroup}
      >
        <Text style={styles.inputLabel}>
          {label}
          {key === "name" && (
            <Text
              style={
                styles.requiredIndicator
              }
            >
              {" "}
              *
            </Text>
          )}
        </Text>

        <View
          style={[
            styles.inputContainer,
            multiline &&
              styles.multilineContainer,
          ]}
        >
          <View
            style={[
              styles.inputIcon,
              multiline &&
                styles.multilineIcon,
            ]}
          >
            <Ionicons
              name={icon}
              size={19}
              color="#09A84E"
            />
          </View>

          <TextInput
            value={form[key]}
            placeholder={placeholder}
            placeholderTextColor="#A0A8A3"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            textAlignVertical={
              multiline ? "top" : "center"
            }
            onChangeText={(text) =>
              handleChange(key, text)
            }
            style={[
              styles.input,
              multiline &&
                styles.multilineInput,
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.container}>
          {/* Header */}

          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.headerButton}
              onPress={() =>
                router.back()
              }
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color="#202622"
              />
            </TouchableOpacity>

            <View
              style={styles.headerContent}
            >
              <Text
                style={styles.headerTitle}
              >
                Edit Contact
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Update extracted card
                details
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.headerSaveButton}
              onPress={saveChanges}
            >
              <Ionicons
                name="checkmark"
                size={22}
                color="#09A84E"
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom:
                  140 + insets.bottom,
              },
            ]}
          >
            {/* Contact Summary */}

            <View
              style={styles.profileCard}
            >
              <View
                style={
                  styles.profileDecoration
                }
              />

              <View style={styles.avatarOuter}>
                <View style={styles.avatar}>
                  <Text
                    style={styles.avatarText}
                  >
                    {(
                      form.name.charAt(0) ||
                      "?"
                    ).toUpperCase()}
                  </Text>
                </View>

                <View
                  style={
                    styles.editAvatarBadge
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={13}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              <View
                style={
                  styles.profileDetails
                }
              >
                <Text
                  style={
                    styles.profileName
                  }
                  numberOfLines={1}
                >
                  {form.name.trim() ||
                    "Unnamed Contact"}
                </Text>

                <Text
                  style={
                    styles.profileSubtitle
                  }
                  numberOfLines={1}
                >
                  {form.designation ||
                    form.company ||
                    "Business contact"}
                </Text>

                <View
                  style={
                    styles.extractedBadge
                  }
                >
                  <Ionicons
                    name="sparkles"
                    size={12}
                    color="#078E42"
                  />

                  <Text
                    style={
                      styles.extractedBadgeText
                    }
                  >
                    AI extracted
                  </Text>
                </View>
              </View>
            </View>

            {/* Personal Details */}

            <View style={styles.sectionHeader}>
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#09A84E"
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Personal details
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Basic contact information
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              {inputConfigs
                .slice(0, 3)
                .map(renderInput)}
            </View>

            {/* Contact Details */}

            <View style={styles.sectionHeader}>
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color="#09A84E"
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Contact details
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Phone, email and website
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              {inputConfigs
                .slice(3, 6)
                .map(renderInput)}
            </View>

            {/* Location Details */}

            <View style={styles.sectionHeader}>
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color="#09A84E"
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Location details
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Address and country
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              {inputConfigs
                .slice(6)
                .map(renderInput)}
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#09A84E"
                />
              </View>

              <Text style={styles.infoText}>
                Review the extracted
                information carefully before
                saving the contact.
              </Text>
            </View>
          </ScrollView>

          {/* Fixed Save Button */}

          <View
            style={[
              styles.bottomContainer,
              {
                paddingBottom: Math.max(
                  insets.bottom,
                  14
                ),
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.saveButton}
              onPress={saveChanges}
            >
              <View
                style={styles.saveIcon}
              >
                <Ionicons
                  name="save-outline"
                  size={20}
                  color="#09A84E"
                />
              </View>

              <View
                style={styles.saveContent}
              >
                <Text
                  style={styles.saveText}
                >
                  Save Changes
                </Text>

                <Text
                  style={
                    styles.saveSubtitle
                  }
                >
                  Update this extracted
                  contact
                </Text>
              </View>

              <Ionicons
                name="arrow-forward"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  keyboardContainer: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },

  header: {
    minHeight: 76,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9F8",
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  headerContent: {
    flex: 1,
    marginLeft: 14,
  },

  headerTitle: {
    color: "#171D19",
    fontSize: 21,
    fontWeight: "900",
  },

  headerSubtitle: {
    marginTop: 3,
    color: "#858E89",
    fontSize: 11.5,
    fontWeight: "500",
  },

  headerSaveButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  profileCard: {
    minHeight: 142,
    padding: 18,
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAE6",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.055,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  profileDecoration: {
    position: "absolute",
    top: -45,
    right: -30,
    width: 145,
    height: 145,
    borderRadius: 73,
    backgroundColor: "#EFF9F3",
  },

  avatarOuter: {
    position: "relative",
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 27,
    backgroundColor: "#09A84E",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.22,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "900",
  },

  editAvatarBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: "#202722",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  profileDetails: {
    flex: 1,
    marginLeft: 16,
  },

  profileName: {
    color: "#202622",
    fontSize: 19,
    fontWeight: "900",
  },

  profileSubtitle: {
    marginTop: 5,
    color: "#7B8580",
    fontSize: 12.5,
    fontWeight: "600",
  },

  extractedBadge: {
    alignSelf: "flex-start",
    minHeight: 29,
    marginTop: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#EAF8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  extractedBadgeText: {
    marginLeft: 5,
    color: "#078E42",
    fontSize: 10.5,
    fontWeight: "800",
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  sectionTitle: {
    marginLeft: 11,
    color: "#242A26",
    fontSize: 15,
    fontWeight: "800",
  },

  sectionSubtitle: {
    marginTop: 2,
    marginLeft: 11,
    color: "#8A938E",
    fontSize: 10.5,
    fontWeight: "500",
  },

  formCard: {
    paddingHorizontal: 15,
    paddingTop: 16,
    paddingBottom: 2,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",

    shadowColor: "#17261D",
    shadowOpacity: 0.04,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    marginBottom: 8,
    color: "#515B55",
    fontSize: 12.5,
    fontWeight: "700",
  },

  requiredIndicator: {
    color: "#E05252",
  },

  inputContainer: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E4E9E6",
    flexDirection: "row",
    alignItems: "center",
  },

  multilineContainer: {
    minHeight: 104,
    alignItems: "flex-start",
  },

  inputIcon: {
    width: 43,
    height: 43,
    marginLeft: 6,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  multilineIcon: {
    marginTop: 6,
  },

  input: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#242B27",
    fontSize: 14,
    fontWeight: "600",
  },

  multilineInput: {
    minHeight: 102,
    paddingTop: 15,
  },

  infoCard: {
    marginTop: 20,
    padding: 14,
    borderRadius: 17,
    backgroundColor: "#EFF9F3",
    borderWidth: 1,
    borderColor: "#DCEFE4",
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  infoText: {
    flex: 1,
    marginLeft: 11,
    color: "#66736B",
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "500",
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

  saveButton: {
    minHeight: 60,
    paddingHorizontal: 14,
    borderRadius: 18,
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

  saveIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  saveContent: {
    flex: 1,
    marginLeft: 12,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },

  saveSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 10.5,
    fontWeight: "500",
  },
});