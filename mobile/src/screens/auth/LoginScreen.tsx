import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { useAuth } from "../../auth/AuthProvider";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  return <View><Text>PresentSir</Text>
    <TextInput placeholder="Login ID" value={loginId} onChangeText={setLoginId} />
    <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
    <Button title="Sign in" onPress={() => void signIn(loginId, password)} />
  </View>;
}
