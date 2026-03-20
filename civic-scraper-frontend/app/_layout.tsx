// app/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../lib/theme';

function TabBarIcon({
  name,
  focused,
  color,
}: {
  name: 'feed' | 'upcoming' | 'starred';
  focused: boolean;
  color: string;
}) {
  const icons = {
    feed: focused ? 'newspaper' : 'newspaper-outline',
    upcoming: focused ? 'calendar' : 'calendar-outline',
    starred: focused ? 'star' : 'star-outline',
  };

  return <Ionicons name={icons[name]} size={20} color={color} />;
}

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.purple700,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: Platform.OS === 'ios' ? 80 : 60,
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          },
          tabBarActiveTintColor: Colors.purple50,
          tabBarInactiveTintColor: Colors.purple100 + '99',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ focused, color }) => (
              <TabBarIcon name="feed" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="upcoming"
          options={{
            title: 'Upcoming',
            tabBarIcon: ({ focused, color }) => (
              <TabBarIcon name="upcoming" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="starred"
          options={{
            title: 'Starred',
            tabBarIcon: ({ focused, color }) => (
              <TabBarIcon name="starred" focused={focused} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
