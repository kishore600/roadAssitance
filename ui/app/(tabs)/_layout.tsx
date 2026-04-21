import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="customer"
        options={{
          title: 'home',
          tabBarIcon: ({ color, size }) => <Ionicons name="car-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />
        }}
      />
       <Tabs.Screen
        name="profile"
        options={{
          title: 'profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="happy" color={color} size={size} />
        }}
      />
    </Tabs>
  );
}