// components/LocationPicker.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { SavedLocation } from '@/types';

interface LocationPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelectLocation: (location: {
        latitude: number;
        longitude: number;
        address: string;
        isCurrentLocation?: boolean;
        savedLocationId?: string;
    }) => void;
    currentLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
    } | null;
}

interface Suggestion {
    id: string;
    description: string;
    place_id: string;
    structured_formatting?: {
        main_text: string;
        secondary_text: string;
    };
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    visible,
    onClose,
    onSelectLocation,
    currentLocation,
}) => {
    const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');
    const [newLocationAddress, setNewLocationAddress] = useState('');
    const [savingLocation, setSavingLocation] = useState(false);
    const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
    const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
    
    // Autocomplete states
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [selectedAddressDetails, setSelectedAddressDetails] = useState<{
        lat: number;
        lng: number;
        formatted_address: string;
    } | null>(null);
    
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (visible) {
            loadSavedLocations();
        }
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [visible]);

    const loadSavedLocations = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/location/saved-locations');
            setSavedLocations(data || []);
        } catch (error) {
            console.error('Failed to load saved locations:', error);
            Alert.alert('Error', 'Failed to load saved locations');
        } finally {
            setLoading(false);
        }
    };

    // Google Places Autocomplete with better error handling
    const fetchPlaceSuggestions = async (input: string) => {
        if (!input.trim() || input.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Check if API key exists
        if (!GOOGLE_MAPS_API_KEY) {
            console.error('Google Maps API key is missing!');
            Alert.alert('Configuration Error', 'Google Maps API key is not configured');
            return;
        }

        setIsLoadingSuggestions(true);
        try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
                input
            )}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`;
            
            console.log('Fetching suggestions...');
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('API Response Status:', data.status);
            
            if (data.status === 'OK' && data.predictions) {
                setSuggestions(
                    data.predictions.map((prediction: any) => ({
                        id: prediction.place_id,
                        description: prediction.description,
                        place_id: prediction.place_id,
                        structured_formatting: prediction.structured_formatting,
                    }))
                );
                setShowSuggestions(true);
            } else if (data.status === 'REQUEST_DENIED') {
                console.error('API Key Error:', data.error_message);
                Alert.alert('API Error', data.error_message || 'Invalid API key');
                setSuggestions([]);
                setShowSuggestions(false);
            } else if (data.status === 'ZERO_RESULTS') {
                setSuggestions([]);
                setShowSuggestions(false);
            } else {
                console.error('Places API error:', data.status, data.error_message);
                setSuggestions([]);
                setShowSuggestions(false);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            Alert.alert('Network Error', 'Failed to fetch address suggestions');
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const getPlaceDetails = async (placeId: string) => {
        if (!GOOGLE_MAPS_API_KEY) {
            Alert.alert('Configuration Error', 'Google Maps API key is not configured');
            return;
        }

        setIsLoadingSuggestions(true);
        try {
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry,formatted_address,name`;
            
            console.log('Fetching place details for:', placeId);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('Place Details Status:', data.status);
            
            if (data.status === 'OK' && data.result) {
                const location = data.result.geometry.location;
                const formattedAddress = data.result.formatted_address;
                
                setSelectedAddressDetails({
                    lat: location.lat,
                    lng: location.lng,
                    formatted_address: formattedAddress,
                });
                
                setNewLocationAddress(formattedAddress);
                setShowSuggestions(false);
            } else if (data.status === 'REQUEST_DENIED') {
                console.error('API Key Error:', data.error_message);
                Alert.alert('API Error', data.error_message || 'Invalid API key');
            } else {
                Alert.alert('Error', 'Failed to get address details');
            }
        } catch (error) {
            console.error('Error getting place details:', error);
            Alert.alert('Error', 'Failed to get address details');
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const handleAddressChange = (text: string) => {
        setNewLocationAddress(text);
        setSelectedAddressDetails(null);
        
        // Clear previous timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        
        // Set new timer for autocomplete
        debounceTimer.current = setTimeout(() => {
            fetchPlaceSuggestions(text);
        }, 500);
    };

    const handleUseCurrentLocation = async () => {
        setIsGettingCurrentLocation(true);
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission required', 'Please enable location access to use current location.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const addressResponse = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            const address = addressResponse[0]
                ? `${addressResponse[0].street || ''} ${addressResponse[0].city || ''} ${addressResponse[0].region || ''}`.trim()
                : 'Current Location';

            onSelectLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                address: address || 'Current Location',
                isCurrentLocation: true,
            });
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to get current location');
        } finally {
            setIsGettingCurrentLocation(false);
        }
    };

    const handleSelectSavedLocation = (location: SavedLocation) => {
        onSelectLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            isCurrentLocation: false,
            savedLocationId: location.id,
        });
        onClose();
    };

    const handleSaveNewLocation = async () => {
        if (!newLocationName.trim()) {
            Alert.alert('Error', 'Please enter a location name');
            return;
        }
        
        if (!selectedAddressDetails && !newLocationAddress.trim()) {
            Alert.alert('Error', 'Please select a valid address from suggestions');
            return;
        }

        setSavingLocation(true);
        try {
            let latitude, longitude, address;
            
            if (selectedAddressDetails) {
                latitude = selectedAddressDetails.lat;
                longitude = selectedAddressDetails.lng;
                address = selectedAddressDetails.formatted_address;
            } else {
                // Fallback to geocoding if no suggestion selected
                const geocode = await Location.geocodeAsync(newLocationAddress);
                if (geocode.length === 0) {
                    Alert.alert('Error', 'Could not find coordinates for this address');
                    return;
                }
                latitude = geocode[0].latitude;
                longitude = geocode[0].longitude;
                address = newLocationAddress;
            }

            const { data } = await api.post('/location/saved-locations', {
                name: newLocationName,
                address: address,
                latitude,
                longitude,
                is_default: savedLocations.length === 0,
            });

            setSavedLocations([data, ...savedLocations]);
            setShowAddForm(false);
            setNewLocationName('');
            setNewLocationAddress('');
            setSelectedAddressDetails(null);
            setSuggestions([]);
            Alert.alert('Success', 'Location saved successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to save location');
        } finally {
            setSavingLocation(false);
        }
    };


    const testGooglePlacesAPI = async () => {
    console.log('Testing Google Places API...');
    console.log('API Key exists:', !!GOOGLE_MAPS_API_KEY);
    
    if (!GOOGLE_MAPS_API_KEY) {
        console.error('API Key is missing!');
        Alert.alert('Error', 'Google Maps API key is not configured. Please check your .env file.');
        return;
    }
    
    try {
        const testUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=Times&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(testUrl);
        const data = await response.json();
        console.log('Test API Response:', data);
        
        if (data.status === 'OK') {
            Alert.alert('Success', 'Google Places API is working!');
        } else {
            Alert.alert('API Error', `Status: ${data.status}\nMessage: ${data.error_message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Test error:', error);
        Alert.alert('Error', 'Failed to test API');
    }
};

    const handleUpdateLocation = async () => {
        if (!editingLocation) return;
        
        if (!newLocationName.trim()) {
            Alert.alert('Error', 'Please enter a location name');
            return;
        }
        
        if (!selectedAddressDetails && !newLocationAddress.trim()) {
            Alert.alert('Error', 'Please select a valid address from suggestions');
            return;
        }

        setSavingLocation(true);
        try {
            let latitude, longitude, address;
            
            if (selectedAddressDetails) {
                latitude = selectedAddressDetails.lat;
                longitude = selectedAddressDetails.lng;
                address = selectedAddressDetails.formatted_address;
            } else {
                // Fallback to geocoding if no suggestion selected
                const geocode = await Location.geocodeAsync(newLocationAddress);
                if (geocode.length === 0) {
                    Alert.alert('Error', 'Could not find coordinates for this address');
                    return;
                }
                latitude = geocode[0].latitude;
                longitude = geocode[0].longitude;
                address = newLocationAddress;
            }

            const { data } = await api.put(`/location/saved-locations/${editingLocation.id}`, {
                name: newLocationName,
                address: address,
                latitude,
                longitude,
            });

            setSavedLocations(savedLocations.map(loc => 
                loc.id === editingLocation.id ? data : loc
            ));
            setShowAddForm(false);
            setEditingLocation(null);
            setNewLocationName('');
            setNewLocationAddress('');
            setSelectedAddressDetails(null);
            setSuggestions([]);
            Alert.alert('Success', 'Location updated successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update location');
        } finally {
            setSavingLocation(false);
        }
    };

    const handleDeleteLocation = async (locationId: string) => {
        Alert.alert(
            'Delete Location',
            'Are you sure you want to delete this saved location?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/location/saved-locations/${locationId}`);
                            setSavedLocations(savedLocations.filter(l => l.id !== locationId));
                            Alert.alert('Success', 'Location deleted successfully');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete location');
                        }
                    },
                },
            ]
        );
    };

    const handleSetDefault = async (locationId: string) => {
        try {
            await api.patch(`/location/saved-locations/${locationId}/set-default`,{});
            setSavedLocations(savedLocations.map(loc => ({
                ...loc,
                is_default: loc.id === locationId
            })));
            Alert.alert('Success', 'Default location updated');
        } catch (error) {
            Alert.alert('Error', 'Failed to set default location');
        }
    };

    const handleEditLocation = (location: SavedLocation) => {
        setEditingLocation(location);
        setNewLocationName(location.name);
        setNewLocationAddress(location.address);
        setSelectedAddressDetails({
            lat: location.latitude,
            lng: location.longitude,
            formatted_address: location.address,
        });
        setShowAddForm(true);
    };

    const renderSuggestion = ({ item }: { item: Suggestion }) => (
        <TouchableOpacity
            style={styles.suggestionItem}
            onPress={() => getPlaceDetails(item.place_id)}
        >
            <Ionicons name="location-outline" size={20} color="#64748B" />
            <View style={styles.suggestionTextContainer}>
                <Text style={styles.suggestionMainText}>
                    {item.structured_formatting?.main_text || item.description}
                </Text>
                {item.structured_formatting?.secondary_text && (
                    <Text style={styles.suggestionSecondaryText}>
                        {item.structured_formatting.secondary_text}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderLocationItem = ({ item }: { item: SavedLocation }) => (
        <TouchableOpacity
            style={styles.locationItem}
            onPress={() => handleSelectSavedLocation(item)}
        >
            <View style={styles.locationIcon}>
                <Ionicons name="location" size={24} color="#0F172A" />
            </View>
            <View style={styles.locationInfo}>
                <View style={styles.locationHeader}>
                    <Text style={styles.locationName}>{item.name}</Text>
                    {item.is_default && (
                        <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.locationAddress} numberOfLines={2}>
                    {item.address}
                </Text>
            </View>
            <View style={styles.locationActions}>
                <TouchableOpacity
                    onPress={() => handleEditLocation(item)}
                    style={styles.actionButton}
                >
                    <Ionicons name="pencil-outline" size={20} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleSetDefault(item.id)}
                    style={styles.actionButton}
                >
                    <Ionicons name="star-outline" size={20} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleDeleteLocation(item.id)}
                    style={styles.actionButton}
                >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Select Location</Text>
                    <View style={{ width: 40 }} />
                </View>

                {!showAddForm ? (
                    <>
                        <TouchableOpacity
                            style={styles.currentLocationButton}
                            onPress={handleUseCurrentLocation}
                            disabled={isGettingCurrentLocation}
                        >
                            {isGettingCurrentLocation ? (
                                <ActivityIndicator color="#0F172A" />
                            ) : (
                                <>
                                    <Ionicons name="locate" size={24} color="#0F172A" />
                                    <Text style={styles.currentLocationText}>
                                        Use Current Location
                                    </Text>
                                    {currentLocation && (
                                        <Text style={styles.currentLocationHint}>
                                            {currentLocation.address || 'Fetching...'}
                                        </Text>
                                    )}
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>Saved Locations</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {loading ? (
                            <ActivityIndicator style={styles.loader} color="#0F172A" />
                        ) : (
                            <FlatList
                                data={savedLocations}
                                keyExtractor={(item) => item.id}
                                renderItem={renderLocationItem}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Ionicons name="location-outline" size={48} color="#CBD5E1" />
                                        <Text style={styles.emptyStateText}>
                                            No saved locations yet
                                        </Text>
                                        <Text style={styles.emptyStateSubtext}>
                                            Save your favorite places for quick access
                                        </Text>
                                    </View>
                                }
                            />
                        )}

                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => {
                                setEditingLocation(null);
                                setNewLocationName('');
                                setNewLocationAddress('');
                                setSelectedAddressDetails(null);
                                setSuggestions([]);
                                setShowAddForm(true);
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#0F172A" />
                            <Text style={styles.addButtonText}>Add New Location</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.addForm}>
                        <Text style={styles.formTitle}>
                            {editingLocation ? 'Edit Location' : 'Save New Location'}
                        </Text>
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Location Name (e.g., Home, Work)"
                            value={newLocationName}
                            onChangeText={setNewLocationName}
                        />
                        
                        <View style={styles.addressInputContainer}>
                            <TextInput
                                style={[styles.input, styles.addressInput]}
                                placeholder="Enter address (start typing for suggestions)"
                                value={newLocationAddress}
                                onChangeText={handleAddressChange}
                                multiline
                            />
                            {isLoadingSuggestions && (
                                <ActivityIndicator style={styles.suggestionLoader} color="#0F172A" />
                            )}
                        </View>
                        
                        {showSuggestions && suggestions.length > 0 && (
                            <FlatList
                                data={suggestions}
                                keyExtractor={(item) => item.id}
                                renderItem={renderSuggestion}
                                style={styles.suggestionsList}
                                keyboardShouldPersistTaps="handled"
                            />
                        )}
                        
                        {selectedAddressDetails && (
                            <View style={styles.selectedLocationPreview}>
                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                <Text style={styles.selectedLocationText}>
                                    Location selected
                                </Text>
                            </View>
                        )}
                        
                        <View style={styles.formActions}>
                            <TouchableOpacity
                                style={[styles.formButton, styles.cancelFormButton]}
                                onPress={() => {
                                    setShowAddForm(false);
                                    setEditingLocation(null);
                                    setNewLocationName('');
                                    setNewLocationAddress('');
                                    setSelectedAddressDetails(null);
                                    setSuggestions([]);
                                }}
                            >
                                <Text style={styles.cancelFormButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.formButton, styles.saveFormButton]}
                                onPress={editingLocation ? handleUpdateLocation : handleSaveNewLocation}
                                disabled={savingLocation || (!selectedAddressDetails && !newLocationAddress.trim())}
                            >
                                {savingLocation ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveFormButtonText}>
                                        {editingLocation ? 'Update' : 'Save'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
    },
    currentLocationButton: {
        backgroundColor: '#FFF',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    currentLocationText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginTop: 8,
    },
    currentLocationHint: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        textAlign: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        marginHorizontal: 12,
        color: '#64748B',
        fontSize: 14,
    },
    locationItem: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    locationIcon: {
        marginRight: 12,
        justifyContent: 'center',
    },
    locationInfo: {
        flex: 1,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginRight: 8,
    },
    defaultBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    defaultBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '600',
    },
    locationAddress: {
        fontSize: 14,
        color: '#64748B',
    },
    locationActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    loader: {
        marginTop: 40,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 16,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 8,
        textAlign: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 16,
        padding: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#0F172A',
        borderStyle: 'dashed',
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginLeft: 8,
    },
    addForm: {
        padding: 16,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        fontSize: 16,
    },
    addressInputContainer: {
        position: 'relative',
    },
    addressInput: {
        minHeight: 80,
        textAlignVertical: 'top',
        paddingRight: 40,
    },
    suggestionLoader: {
        position: 'absolute',
        right: 12,
        top: 30,
    },
    suggestionsList: {
        maxHeight: 200,
        backgroundColor: '#FFF',
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    suggestionTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    suggestionMainText: {
        fontSize: 14,
        color: '#0F172A',
    },
    suggestionSecondaryText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    selectedLocationPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    selectedLocationText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#065F46',
        fontWeight: '500',
    },
    formActions: {
        flexDirection: 'row',
        marginTop: 16,
    },
    formButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelFormButton: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 8,
    },
    cancelFormButtonText: {
        color: '#64748B',
        fontSize: 16,
        fontWeight: '600',
    },
    saveFormButton: {
        backgroundColor: '#0F172A',
        marginLeft: 8,
    },
    saveFormButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});