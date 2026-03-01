import { StyleSheet, ScrollView, Text, View, Platform } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function HowToUseScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const textColor = isDark ? '#f1f5f9' : '#1a1a1a';
  const muted = isDark ? 'rgba(226,232,240,0.82)' : 'rgba(0,0,0,0.65)';
  const cardBg = isDark ? 'rgba(26,26,46,0.5)' : 'rgba(0,0,0,0.04)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const codeBg = isDark ? 'rgba(30,30,50,0.8)' : 'rgba(0,0,0,0.06)';
  const codeBorder = isDark ? 'rgba(52,211,153,0.3)' : 'rgba(34,197,94,0.25)';

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: textColor }]}>How to use ShelterScan</Text>
      <Text style={[styles.intro, { color: muted }]}>
        ShelterScan helps you find the safest spots in a room for different emergencies.
      </Text>

      <View style={[styles.stepCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.stepTitle, { color: textColor }]}>1. Pick a scenario</Text>
        <Text style={[styles.stepBody, { color: muted }]}>
          Choose earthquake, flood, tornado, or another mode at the bottom of the Scan tab. The app will look for safe cover and hazards for that situation.
        </Text>
      </View>

      <View style={[styles.stepCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.stepTitle, { color: textColor }]}>2. Start a scan</Text>
        <Text style={[styles.stepBody, { color: muted }]}>
        Tap “Start scan,” then move your phone slowly in a circle so the camera captures the whole room. Tap “Done” when you’ve covered the space.
      </Text>
      </View>

      <View style={[styles.stepCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.stepTitle, { color: textColor }]}>3. See your results</Text>
      <Text style={[styles.stepBody, { color: muted }]}>
        You’ll get a safety summary: the safest spot, what to do, and what to avoid. Tap “Hear summary” to have it read aloud.
      </Text>
      </View>

      <View style={[styles.stepCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.stepTitle, { color: textColor }]}>API key (for room analysis)</Text>
        <Text style={[styles.stepBody, { color: muted }]}>
          To analyze your room, you need an OpenAI API key. Get one at platform.openai.com, then add a file named .env in the project root (same folder as package.json) with this line:
        </Text>
        <View style={[styles.codeBlock, { backgroundColor: codeBg, borderColor: codeBorder, borderWidth: 1 }]}>
          <Text style={[styles.code, { color: isDark ? '#34d399' : Colors[colorScheme].tint }]}>
            EXPO_PUBLIC_OPENAI_API_KEY=your_key_here
          </Text>
        </View>
        <Text style={[styles.stepBody, { color: muted, marginTop: 10 }]}>
          Restart the app after adding the key. Without it, scanning will remind you to set it up.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#0f0f1a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 22,
  },
  stepCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  stepBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  codeBlock: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
  },
  code: {
    fontFamily: Platform?.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
});
