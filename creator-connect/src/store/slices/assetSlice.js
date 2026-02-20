import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getMyAssets, getPublicAssets } from '../../api/assetApi'

export const fetchAssetsData = createAsyncThunk(
  'asset/fetchAssetsData',
  async (_, thunkApi) => {
    try {
      const [publicResponse, myResponse] = await Promise.all([getPublicAssets(), getMyAssets()])
      return {
        publicAssets: publicResponse?.data || [],
        myAssets: myResponse?.data || [],
      }
    } catch (error) {
      return thunkApi.rejectWithValue(error.message || 'Could not load assets')
    }
  },
  {
    condition: (_, { getState }) => {
      const { asset } = getState()
      return !asset.hasLoaded && !asset.isLoadingAssets
    },
  },
)

const initialState = {
  activeTab: 'home',
  publicAssets: [],
  myAssets: [],
  isLoadingAssets: false,
  loadingError: '',
  hasLoaded: false,
}

const assetSlice = createSlice({
  name: 'asset',
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload
    },
    setLoadingError: (state, action) => {
      state.loadingError = action.payload
    },
    clearLoadingError: (state) => {
      state.loadingError = ''
    },
    prependCreatedAsset: (state, action) => {
      const createdAsset = action.payload
      state.myAssets = [createdAsset, ...state.myAssets]
      if (createdAsset.visibility === 'public') {
        state.publicAssets = [createdAsset, ...state.publicAssets]
      }
    },
    removeAssetOptimistic: (state, action) => {
      const assetId = action.payload
      state.myAssets = state.myAssets.filter((asset) => asset.id !== assetId)
      state.publicAssets = state.publicAssets.filter((asset) => asset.id !== assetId)
    },
    restoreAssetsState: (state, action) => {
      state.myAssets = action.payload.myAssets || []
      state.publicAssets = action.payload.publicAssets || []
    },
    resetAssetsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssetsData.pending, (state) => {
        state.isLoadingAssets = true
        state.loadingError = ''
      })
      .addCase(fetchAssetsData.fulfilled, (state, action) => {
        state.isLoadingAssets = false
        state.publicAssets = action.payload.publicAssets
        state.myAssets = action.payload.myAssets
        state.hasLoaded = true
      })
      .addCase(fetchAssetsData.rejected, (state, action) => {
        state.isLoadingAssets = false
        state.loadingError = action.payload || 'Could not load assets'
      })
  },
})

export const {
  setActiveTab,
  setLoadingError,
  clearLoadingError,
  prependCreatedAsset,
  removeAssetOptimistic,
  restoreAssetsState,
  resetAssetsState,
} = assetSlice.actions

export default assetSlice.reducer
