import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  SafeAreaView,
} from "react-native";



import { router } from "expo-router";

const isLoggedIn = false;

export default function SplashScreen() {
  const [checking, setChecking] = useState(true);
  const { height } = useWindowDimensions();

  const isSmallPhone = height < 700;

  useEffect(() => {
    const timer = setTimeout(() => {
      setChecking(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    router.replace(isLoggedIn ? "/home" : "/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.mainContent}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={[styles.logo, isSmallPhone && styles.logoSmall]}
            resizeMode="contain"
          />

          <Text style={[styles.title, isSmallPhone && styles.titleSmall]}>
            Scan<Text style={styles.blue}>2</Text>Sheet
          </Text>

          <Text style={styles.tagline}>SCAN. EXTRACT. EXPORT.</Text>

          <Text style={[styles.description, isSmallPhone && styles.descriptionSmall]}>
            Scan business cards and extract data in seconds.
          </Text>
        </View>

        <View style={styles.footer}>
          {checking ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color="#2563FF" />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.85}
              onPress={handleNext}
            >
              <Text style={styles.buttonText}>
                {isLoggedIn ? "Continue" : "Get Started"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.dots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
  },

  logo: {
    width: "70%",
    maxWidth: 260,
    height: 190,
    marginBottom: -4,
  },
  logoSmall: {
    maxWidth: 220,
    height: 160,
  },

  title: {
    fontSize: 38,
    fontWeight: "900",
    color: "#07122F",
    letterSpacing: -1.2,
    textAlign: "center",
    marginTop: -50,
  },
  titleSmall: {
    fontSize: 32,
  },
  blue: {
    color: "#2563FF",
  },

  tagline: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#2563FF",
    textAlign: "center",
  },

  description: {
    marginTop: 34,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    fontSize: 13,
    fontWeight: "500",
  },
  descriptionSmall: {
    marginTop: 24,
    fontSize: 12,
  },

  footer: {
    alignItems: "center",
    paddingBottom: 34,
    minHeight: 120,
  },

  loaderBox: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  button: {
    width: "82%",
    maxWidth: 320,
    height: 52,
    backgroundColor: "#2563FF",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: "#DDE6FF",
  },

  activeDot: {
    width: 30,
    backgroundColor: "#2563FF",
  },
});