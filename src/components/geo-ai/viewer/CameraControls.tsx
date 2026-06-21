'use client'
import { useThree } from '@react-three/fiber'
import { forwardRef, useImperativeHandle } from 'react'
import { OrbitControls } from '@react-three/drei'

export interface CameraControlsHandle {
  reset: () => void
}

export const CameraControls = forwardRef<CameraControlsHandle>((_, ref) => {
  const { camera } = useThree()

  useImperativeHandle(ref, () => ({
    reset() {
      camera.position.set(3, 3, 3)
      camera.lookAt(0, 0, 0)
    },
  }))

  return <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
})

CameraControls.displayName = 'CameraControls'
