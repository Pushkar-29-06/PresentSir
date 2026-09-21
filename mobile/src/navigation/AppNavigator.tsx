import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthProvider";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RoleHomeScreen } from "../screens/RoleHomeScreen";
import { DeviceRegistrationScreen } from "../device/DeviceRegistrationScreen";
import { QrScannerScreen } from "../attendance/QrScannerScreen";
import { StudentAttendanceScreen } from "../student/StudentAttendanceScreen";
import { StudentAnalyticsScreen } from "../student/StudentAnalyticsScreen";
import { StudentDisputeScreen } from "../student/StudentDisputeScreen";

const Stack = createNativeStackNavigator();

function StudentNavigator() {
  return <Stack.Navigator>
    <Stack.Screen name="StudentHome">{() => <RoleHomeScreen role="STUDENT" />}</Stack.Screen>
    <Stack.Screen name="DeviceRegistration" component={DeviceRegistrationScreen} options={{ title: "Device status" }} />
    <Stack.Screen name="ScanAttendance" component={QrScannerScreen} options={{ headerShown: false }} />
    <Stack.Screen name="StudentAttendance">{({ navigation }) => <StudentAttendanceScreen navigation={navigation} />}</Stack.Screen>
    <Stack.Screen name="StudentAnalytics" component={StudentAnalyticsScreen} />
    <Stack.Screen name="StudentDispute" component={StudentDisputeScreen} />
  </Stack.Navigator>;
}

function FacultyNavigator() {
  return <Stack.Navigator><Stack.Screen name="FacultyHome">{() => <RoleHomeScreen role="FACULTY" />}</Stack.Screen></Stack.Navigator>;
}

export function AppNavigator() {
  const { user } = useAuth();
  return <NavigationContainer>
    {user ? (user.role === "STUDENT" ? <StudentNavigator /> : <FacultyNavigator />)
      : <Stack.Navigator><Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} /></Stack.Navigator>}
  </NavigationContainer>;
}
