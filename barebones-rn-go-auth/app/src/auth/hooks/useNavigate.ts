import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigateProps = {
  screen: string;
};

// Define a base param list type
type ParamListBase = {
  [key: string]: undefined | object;
};

export const useNavigate = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  const navigate = ({ screen }: NavigateProps) => {
    navigation.navigate(screen);
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const reset = (screen: string) => {
    navigation.reset({
      index: 0,
      routes: [{ name: screen }],
    });
  };

  const navigateToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return {
    navigate,
    navigateToLogin,
    goBack,
    reset,
    navigation,
  };
};