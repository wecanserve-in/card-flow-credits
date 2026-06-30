import { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { uploadCards } from "../services/scanService";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<any>(null);

const [images, setImages] = useState<string[]>([]);
const [loading, setLoading] = useState(false);

  if (!permission) return null;

  // Permission Screen
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          Camera permission required
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Capture Photo
  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
  quality: 0.8,
});

console.log("Photo URI:", photo.uri);

console.log(photo.uri);

setImages((prev) => [...prev, photo.uri]);
    } catch (error) {
      Alert.alert("Error", "Failed to capture image.");
    }
  };

const handleUpload = () => {
  if (images.length === 0) {
    Alert.alert(
      "No Cards",
      "Please scan at least one card."
    );
    return;
  }

(globalThis as any).scannedImages = images;

  router.push("/scanned-queue");
}; // ← THIS WAS MISSING

  // Main Camera Screen
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />

      {/* Top Bar */}

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.icon}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn}>
          <Text style={styles.icon}>⚡</Text>
        </TouchableOpacity>
      </View>

      {/* Scanner Frame */}

      <View style={styles.overlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View style={styles.helperBox}>
          <Text style={styles.helperText}>
            Align card in the frame
          </Text>
        </View>
      </View>

      {/* Bottom Controls */}
<View style={styles.counterContainer}>
  <Text style={styles.counterText}>
    {images.length} Cards Added
  </Text>
</View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.iconBtn}>
          <Text style={styles.icon}>🖼️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureOuter}
          onPress={takePicture}
        >
          <View style={styles.captureInner} />
        </TouchableOpacity>
<TouchableOpacity
  style={styles.doneButton}
  onPress={handleUpload}
  disabled={loading}
>
  {loading ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.doneText}>
      Done ({images.length})
    </Text>
  )}
</TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  permissionText: {
    fontSize: 16,
    marginBottom: 20,
    color: "#000",
  },

  camera: {
    flex: 1,
  },

  preview: {
    flex: 1,
    resizeMode: "contain",
  },

  button: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    margin: 20,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  topBar: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  iconBtn: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  icon: {
    color: "#fff",
    fontSize: 22,
  },

  overlay: {
    position: "absolute",
    top: "28%",
    width: "100%",
    alignItems: "center",
  },

  scanFrame: {
    width: "85%",
    aspectRatio: 1.7,
    position: "relative",
  },

  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#8B5CF6",
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 18,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 18,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 18,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 18,
  },

  helperBox: {
    marginTop: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },

  helperText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  bottomBar: {
    position: "absolute",
    bottom: 50,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  captureOuter: {
    width: 85,
    height: 85,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  captureInner: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: "#2563EB",
  },
  counterContainer: {
  position: "absolute",
  bottom: 150,
  alignSelf: "center",
  backgroundColor: "rgba(0,0,0,0.6)",
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 25,
},

counterText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
},

doneButton: {
  backgroundColor: "#8B5CF6",
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 16,
},

doneText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
},
});