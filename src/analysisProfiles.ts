import { loadProfiles, saveProfile } from './Records'
import type { Profile } from './api'

// Analysis-only profile API. Records keeps its own presentation and selection logic.
export const loadAnalysisProfiles = loadProfiles
export const saveAnalysisProfile = (profile: Profile, id?: string) => saveProfile(profile, id)
