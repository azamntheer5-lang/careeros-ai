import { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DarkTheme as NavDark, DefaultTheme as NavLight } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { PaperProvider, useTheme } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { lightTheme, darkTheme } from '@/theme'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { LoginScreen } from '@/screens/LoginScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { ResumeGeneratorScreen } from '@/screens/ResumeGeneratorScreen'
import { ATSScreen } from '@/screens/ATSScreen'
import { CoverLetterScreen } from '@/screens/CoverLetterScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { ActivityIndicator, View } from 'react-native'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function MainApp() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: 'view-dashboard',
            Resume: 'file-document-edit',
            ATS: 'magnify',
            CoverLetter: 'email-edit',
            Profile: 'account',
          }
          return null // Icons handled by Paper
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ResumeGenerator" component={ResumeGeneratorScreen} options={{ title: 'Resume' }} />
      <Tab.Screen name="ATS" component={ATSScreen} options={{ title: 'ATS' }} />
      <Tab.Screen name="CoverLetter" component={CoverLetterScreen} options={{ title: 'Cover' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

function Root() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {user ? <MainApp /> : <LoginScreen />}
    </NavigationContainer>
  )
}

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const theme = isDark ? darkTheme : lightTheme
  const navTheme = isDark ? NavDark : NavLight

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Root />
      </SafeAreaProvider>
    </PaperProvider>
  )
}
