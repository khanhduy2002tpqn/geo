/**
 * Re-exports shared experiment types from the root geo-ai types module.
 *
 * Experiments are authored as VirtualExperiment objects; this module is the
 * single import point for experiment-related type aliases used within the
 * experiments/ directory.
 */

export type {
  ExperimentFrame,
  VirtualExperiment,
} from '@/types/geo-ai'
