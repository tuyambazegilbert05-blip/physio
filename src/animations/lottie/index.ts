export type LottieAsset = 'savings' | 'community' | 'success' | 'loading' | 'emptyState'
type Loader = () => Promise<{ default: unknown }>

const animationLoaders: Record<LottieAsset, Loader> = {
  savings: () => import('@/assets/lottie/savings.json'),
  community: () => import('@/assets/lottie/community.json'),
  success: () => import('@/assets/lottie/success.json'),
  loading: () => import('@/assets/lottie/loading.json'),
  emptyState: () => import('@/assets/lottie/empty-state.json'),
}

export function loadAnimation(name: LottieAsset) { return animationLoaders[name]() }
