import React, {
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
  CameraView,
  useCameraPermissions,
} from "expo-camera";

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const cameraRef = useRef<any>(null);

  const [images, setImages] =
    useState<string[]>([]);

  const [isCapturing, setIsCapturing] =
    useState(false);

  const [flashEnabled, setFlashEnabled] =
    useState(false);

  if (!permission) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color="#09A84E"
        />

        <Text style={styles.loadingText}>
          Preparing camera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={styles.permissionScreen}
      >
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Ionicons
              name="camera-outline"
              size={42}
              color="#09A84E"
            />
          </View>

          <Text style={styles.permissionTitle}>
            Camera Access Required
          </Text>

          <Text style={styles.permissionText}>
            Snip It needs access to your
            camera to scan business cards
            and extract contact details.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Ionicons
              name="camera"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.permissionButtonText
              }
            >
              Allow Camera Access
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.permissionBackButton}
            onPress={() => router.back()}
          >
            <Text
              style={
                styles.permissionBackText
              }
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (
      !cameraRef.current ||
      isCapturing
    ) {
      return;
    }

    try {
      setIsCapturing(true);

      const start = Date.now();

      const photo =
        await cameraRef.current.takePictureAsync(
          {
            quality: 0.7,
            skipProcessing: true,
          }
        );

      console.log(
        "Capture Time:",
        Date.now() - start,
        "ms"
      );

      if (!photo?.uri) {
        Alert.alert(
          "Capture Failed",
          "The card image could not be captured. Please try again."
        );
        return;
      }

      setImages((previousImages) => {
        if (
          previousImages.includes(
            photo.uri
          )
        ) {
          return previousImages;
        }

        return [
          ...previousImages,
          photo.uri,
        ];
      });
    } catch (error) {
      console.error(
        "Camera capture error:",
        error
      );

      Alert.alert(
        "Camera Error",
        "Something went wrong while capturing the card."
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUpload = () => {
    if (images.length === 0) {
      Alert.alert(
        "No Cards Scanned",
        "Please scan at least one business card before continuing."
      );
      return;
    }

    (globalThis as any).scannedImages =
      images;

    router.push("/scanned-queue");
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        pictureSize="640x480"
        enableTorch={flashEnabled}
      />

      {/* Dark camera overlay */}
      <View
        pointerEvents="none"
        style={styles.cameraShade}
      />

      {/* Header */}
      <View
        style={[
          styles.topBar,
          {
            top: insets.top + 12,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.topIconButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="close"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>
            Scan Business Card
          </Text>

          <Text
            style={styles.screenSubtitle}
          >
            Position the card inside the
            frame
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.topIconButton,
            flashEnabled &&
              styles.activeFlashButton,
          ]}
          onPress={() =>
            setFlashEnabled(
              (current) => !current
            )
          }
        >
          <Ionicons
            name={
              flashEnabled
                ? "flash"
                : "flash-off"
            }
            size={22}
            color={
              flashEnabled
                ? "#122218"
                : "#FFFFFF"
            }
          />
        </TouchableOpacity>
      </View>

      {/* Scanner area */}
      <View style={styles.scannerArea}>
        <View style={styles.instructionBadge}>
          <View
            style={
              styles.instructionDot
            }
          />

          <Text
            style={
              styles.instructionText
            }
          >
            Hold your phone steady
          </Text>
        </View>

        <View style={styles.scanFrame}>
          <View
            style={[
              styles.corner,
              styles.topLeft,
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.topRight,
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.bottomLeft,
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.bottomRight,
            ]}
          />

          <View style={styles.scanLine} />
        </View>

        <Text style={styles.helperText}>
          Make sure all four corners of the
          business card are visible
        </Text>
      </View>

      {/* Bottom panel */}
      <View
        style={[
          styles.bottomPanel,
          {
            paddingBottom:
              Math.max(
                insets.bottom,
                18
              ),
          },
        ]}
      >
        <View style={styles.counterRow}>
          <View style={styles.counterBadge}>
            <View style={styles.counterIcon}>
              <Ionicons
                name="images-outline"
                size={17}
                color="#09A84E"
              />
            </View>

            <View>
              <Text
                style={styles.counterTitle}
              >
                {images.length}{" "}
                {images.length === 1
                  ? "card"
                  : "cards"}{" "}
                added
              </Text>

              <Text
                style={
                  styles.counterSubtitle
                }
              >
                You can scan multiple cards
              </Text>
            </View>
          </View>

          {images.length > 0 && (
            <View
              style={
                styles.successIndicator
              }
            >
              <Ionicons
                name="checkmark"
                size={15}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>

        <View style={styles.controlRow}>
          <View
            style={styles.sidePlaceholder}
          >
            <Ionicons
              name="card-outline"
              size={22}
              color="#8A9490"
            />

            <Text
              style={
                styles.sidePlaceholderText
              }
            >
              Card
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isCapturing}
            style={[
              styles.captureOuter,
              isCapturing &&
                styles.captureDisabled,
            ]}
            onPress={takePicture}
          >
            <View style={styles.captureMiddle}>
              {isCapturing ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <View
                  style={
                    styles.captureInner
                  }
                />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.doneButton,
              images.length === 0 &&
                styles.doneButtonDisabled,
            ]}
            onPress={handleUpload}
          >
            <Text
              style={[
                styles.doneText,
                images.length === 0 &&
                  styles.doneTextDisabled,
              ]}
            >
              Done
            </Text>

            <View
              style={[
                styles.doneCount,
                images.length === 0 &&
                  styles.doneCountDisabled,
              ]}
            >
              <Text
                style={[
                  styles.doneCountText,
                  images.length === 0 &&
                    styles.doneCountTextDisabled,
                ]}
              >
                {images.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#F8FAF9",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
    color: "#6F7874",
    fontSize: 14,
    fontWeight: "600",
  },

  permissionScreen: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },

  permissionContent: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#EAF8F0",
    borderWidth: 1,
    borderColor: "#D6F0E1",
    alignItems: "center",
    justifyContent: "center",
  },

  permissionTitle: {
    marginTop: 22,
    color: "#171C21",
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },

  permissionText: {
    maxWidth: 330,
    marginTop: 10,
    color: "#737C78",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    textAlign: "center",
  },

  permissionButton: {
    width: "100%",
    maxWidth: 330,
    minHeight: 54,
    marginTop: 28,
    borderRadius: 17,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  permissionButtonText: {
    marginLeft: 9,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  permissionBackButton: {
    minHeight: 42,
    marginTop: 13,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  permissionBackText: {
    color: "#737C78",
    fontSize: 14,
    fontWeight: "700",
  },

  cameraShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(0, 0, 0, 0.16)",
  },

  topBar: {
    position: "absolute",
    left: 18,
    right: 18,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  topIconButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor:
      "rgba(15, 20, 18, 0.58)",
    borderWidth: 1,
    borderColor:
      "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  activeFlashButton: {
    backgroundColor: "#DDF7E8",
    borderColor: "#BDEACF",
  },

  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "center",
  },

  screenTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },

  screenSubtitle: {
    marginTop: 3,
    color:
      "rgba(255, 255, 255, 0.72)",
    fontSize: 11.5,
    fontWeight: "500",
    textAlign: "center",
  },

  scannerArea: {
    position: "absolute",
    top: "24%",
    left: 0,
    right: 0,
    alignItems: "center",
  },

  instructionBadge: {
    minHeight: 34,
    marginBottom: 18,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor:
      "rgba(14, 20, 17, 0.60)",
    borderWidth: 1,
    borderColor:
      "rgba(255, 255, 255, 0.14)",
    flexDirection: "row",
    alignItems: "center",
  },

  instructionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#35E27D",
  },

  instructionText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  scanFrame: {
    width: "86%",
    maxWidth: 430,
    aspectRatio: 1.62,
    position: "relative",
    borderRadius: 23,
    backgroundColor:
      "rgba(255, 255, 255, 0.04)",
  },

  corner: {
    position: "absolute",
    width: 47,
    height: 47,
    borderColor: "#35E27D",
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 21,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 21,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 21,
  },

  bottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderBottomRightRadius: 21,
  },

  scanLine: {
    position: "absolute",
    top: "50%",
    left: 18,
    right: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor:
      "rgba(53, 226, 125, 0.72)",
    shadowColor: "#35E27D",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },

  helperText: {
    width: "82%",
    marginTop: 17,
    color:
      "rgba(255, 255, 255, 0.86)",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },

  bottomPanel: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    paddingTop: 15,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor:
      "rgba(250, 252, 251, 0.96)",

    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    elevation: 12,
  },

  counterRow: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  counterBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  counterIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  counterTitle: {
    marginLeft: 10,
    color: "#252B28",
    fontSize: 13,
    fontWeight: "800",
  },

  counterSubtitle: {
    marginLeft: 10,
    marginTop: 2,
    color: "#8A928E",
    fontSize: 10.5,
    fontWeight: "500",
  },

  successIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",
  },

  controlRow: {
    minHeight: 104,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sidePlaceholder: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },

  sidePlaceholderText: {
    marginTop: 5,
    color: "#8A9490",
    fontSize: 10.5,
    fontWeight: "700",
  },

  captureOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  captureDisabled: {
    opacity: 0.65,
  },

  captureMiddle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",
  },

  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor:
      "rgba(255, 255, 255, 0.72)",
  },

  doneButton: {
    minWidth: 82,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  doneButtonDisabled: {
    backgroundColor: "#E6EBE8",
  },

  doneText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  doneTextDisabled: {
    color: "#919994",
  },

  doneCount: {
    minWidth: 23,
    height: 23,
    marginLeft: 7,
    paddingHorizontal: 5,
    borderRadius: 8,
    backgroundColor:
      "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  doneCountDisabled: {
    backgroundColor: "#D8DEDA",
  },

  doneCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  doneCountTextDisabled: {
    color: "#8A928E",
  },
});