import { useRef, useCallback } from 'react'
import { Animated, Easing } from 'react-native'
import { colors } from '../../constants/colors'

const COLORS = [colors.accent, colors.accentSecondary, '#FFB84D', '#FF5C7A', '#93C5FD', '#fff']
const COUNT = 28

type Particle = {
  x: Animated.Value; y: Animated.Value
  opacity: Animated.Value; scale: Animated.Value; rotate: Animated.Value
  color: string; size: number
}

export function useConfetti() {
  const particles = useRef<Particle[]>(
    Array.from({ length: COUNT }, () => ({
      x: new Animated.Value(0), y: new Animated.Value(0),
      opacity: new Animated.Value(0), scale: new Animated.Value(0), rotate: new Animated.Value(0),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 5 + Math.random() * 7,
    }))
  ).current

  const fire = useCallback(() => {
    particles.forEach(p => {
      p.x.setValue(0); p.y.setValue(0)
      p.opacity.setValue(1); p.scale.setValue(0); p.rotate.setValue(0)
    })
    Animated.parallel(
      particles.map(p => {
        const angle = Math.random() * Math.PI * 2
        const dist = 50 + Math.random() * 90
        return Animated.parallel([
          Animated.timing(p.scale, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(p.rotate, { toValue: (Math.random() - 0.5) * 6, duration: 900, useNativeDriver: true }),
          Animated.timing(p.x, { toValue: Math.cos(angle) * dist, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.y, { toValue: Math.sin(angle) * dist - 50, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(350),
            Animated.timing(p.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
        ])
      })
    ).start()
  }, [])

  return { particles, fire }
}
