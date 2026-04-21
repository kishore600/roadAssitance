// app/customer/complete-service.tsx (New file)
import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Ionicons } from "@expo/vector-icons";

export default function CompleteServiceScreen() {
    const { bookingId, mechanicName } = useLocalSearchParams();
    const [otp, setOtp] = useState("");
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState("");
    const [loading, setLoading] = useState(false);
    const [showRating, setShowRating] = useState(false);

    const handleVerifyOTP = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert("Error", "Please enter the 6-digit OTP");
            return;
        }

        setLoading(true);
        try {
            // First verify OTP and complete the service
            const response = await api.post(`/bookings/${bookingId}/complete-with-otp`, {
                otp: otp,
            });

            if (response.data.success) {
                setShowRating(true);
                Alert.alert(
                    "✓ Service Completed!",
                    "Please rate your experience with the mechanic."
                );
            }
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const submitRating = async () => {
        if (rating === 0) {
            Alert.alert("Error", "Please rate your experience");
            return;
        }

        setLoading(true);
        try {
            await api.post(`/bookings/${bookingId}/complete-with-otp`, {
                otp: otp,
                rating: rating,
                review: review.trim() || undefined,
            });

            Alert.alert(
                "Thank You!",
                "Your feedback has been submitted successfully.",
                [{ text: "OK", onPress: () => router.replace("/(tabs)/customer") }]
            );
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Failed to submit rating");
        } finally {
            setLoading(false);
        }
    };

    if (showRating) {
        return (
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.header}>
                        <Ionicons name="star" size={60} color="#FBBF24" />
                        <Text style={styles.title}>Rate Your Experience</Text>
                        <Text style={styles.subtitle}>
                            How was your service with {mechanicName || "the mechanic"}?
                        </Text>
                    </View>

                    <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => setRating(star)}
                                style={styles.starButton}
                            >
                                <Ionicons
                                    name={star <= rating ? "star" : "star-outline"}
                                    size={48}
                                    color="#FBBF24"
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.reviewInput}
                        placeholder="Share your experience (optional)"
                        value={review}
                        onChangeText={setReview}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={submitRating}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Feedback</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Ionicons name="shield-checkmark" size={60} color="#10B981" />
                    <Text style={styles.title}>Verify Service Completion</Text>
                    <Text style={styles.subtitle}>
                        Ask the mechanic for the 6-digit OTP to complete the service
                    </Text>
                </View>

                <View style={styles.otpContainer}>
                    <TextInput
                        style={styles.otpInput}
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                        textAlign="center"
                        autoFocus
                    />
                </View>

                <TouchableOpacity
                    style={[styles.verifyButton, loading && styles.disabledButton]}
                    onPress={handleVerifyOTP}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.verifyButtonText}>Verify & Complete</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F1F5F9" },
    content: { flex: 1, padding: 24, justifyContent: "center" },
    header: { alignItems: "center", marginBottom: 32 },
    title: { fontSize: 24, fontWeight: "700", color: "#0F172A", marginTop: 16 },
    subtitle: { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8 },
    otpContainer: { marginBottom: 24 },
    otpInput: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 16,
        fontSize: 24,
        fontWeight: "600",
        letterSpacing: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    verifyButton: {
        backgroundColor: "#10B981",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    verifyButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
    ratingContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 24,
    },
    starButton: { padding: 8 },
    reviewInput: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 16,
        minHeight: 100,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: "#0F172A",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
    disabledButton: { opacity: 0.6 },
});