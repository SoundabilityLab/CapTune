import { ParameterValues } from './transformService';

/**
 * Interface for parameter changes between UI and mathematical values
 */
export interface ParameterChange {
  parameter: 'detailLevel' | 'expressiveness';
  previousMathValue: number;
  newMathValue: number;
  uiValue: number; // UI value that caused this change
}

/**
 * Parameter mapping between UI values and mathematical values
 */
export class ParameterMapper {
  // Constants for value ranges
  private readonly uiMin = -5;
  private readonly uiMax = 5;
  private readonly mathMin = 1;
  private readonly mathMax = 10;
  
  // Calibration points for each parameter
  private detailLevelCalibration = { ui: 0, math: 5 };
  private expressivenessCalibration = { ui: 0, math: 5 };

  /**
   * Create a new parameter mapper with initial calibration values
   */
  constructor(initialValues?: ParameterValues) {
    if (initialValues) {
      this.detailLevelCalibration.math = initialValues.detailLevel;
      this.expressivenessCalibration.math = initialValues.expressiveness;
    }
  }

  /**
   * Update the calibration based on new mathematical values from AI
   */
  updateCalibration(values: ParameterValues): void {
    this.detailLevelCalibration.math = values.detailLevel;
    this.expressivenessCalibration.math = values.expressiveness;
  }

  /**
   * Recalibrate a specific parameter after the other parameter changes
   */
  recalibrateParameter(
    parameter: 'detailLevel' | 'expressiveness',
    newMathValue: number
  ): void {
    if (parameter === 'detailLevel') {
      this.detailLevelCalibration.math = newMathValue;
    } else {
      this.expressivenessCalibration.math = newMathValue;
    }
  }

  /**
   * Convert a UI value to its mathematical equivalent for a parameter
   */
  uiToMathematical(parameter: 'detailLevel' | 'expressiveness', uiValue: number): number {
    const calibration = parameter === 'detailLevel' 
      ? this.detailLevelCalibration 
      : this.expressivenessCalibration;

    if (uiValue === calibration.ui) {
      return calibration.math;
    }
    
    // Linear mapping with two segments (before and after calibration point)
    if (uiValue < calibration.ui) {
      // Map from uiMin to calibration point
      const ratio = (uiValue - this.uiMin) / (calibration.ui - this.uiMin);
      return this.mathMin + ratio * (calibration.math - this.mathMin);
    } else {
      // Map from calibration point to uiMax
      const ratio = (uiValue - calibration.ui) / (this.uiMax - calibration.ui);
      return calibration.math + ratio * (this.mathMax - calibration.math);
    }
  }

  /**
   * Convert a mathematical value to its UI equivalent for a parameter
   */
  mathematicalToUi(parameter: 'detailLevel' | 'expressiveness', mathValue: number): number {
    const calibration = parameter === 'detailLevel' 
      ? this.detailLevelCalibration 
      : this.expressivenessCalibration;

    if (mathValue === calibration.math) {
      return calibration.ui;
    }
    
    // Linear mapping with two segments
    if (mathValue < calibration.math) {
      // Map from mathMin to calibration point
      const ratio = (mathValue - this.mathMin) / (calibration.math - this.mathMin);
      return this.uiMin + ratio * (calibration.ui - this.uiMin);
    } else {
      // Map from calibration point to mathMax
      const ratio = (mathValue - calibration.math) / (this.mathMax - calibration.math);
      return calibration.ui + ratio * (this.uiMax - calibration.ui);
    }
  }

  /**
   * Get the current mathematical values for both parameters
   */
  getCurrentMathematicalValues(): ParameterValues {
    return {
      detailLevel: this.detailLevelCalibration.math,
      expressiveness: this.expressivenessCalibration.math
    };
  }

  /**
   * Calculate mathematical values for given UI values
   */
  calculateMathematicalValues(detailLevelUi: number, expressivenessUi: number): ParameterValues {
    return {
      detailLevel: this.uiToMathematical('detailLevel', detailLevelUi),
      expressiveness: this.uiToMathematical('expressiveness', expressivenessUi)
    };
  }
}
