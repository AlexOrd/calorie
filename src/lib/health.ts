export type BmiClass = 'underweight' | 'healthy' | 'overweight' | 'obese';

export function bmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function bmiClass(value: number): BmiClass {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'healthy';
  if (value < 30) return 'overweight';
  return 'obese';
}

export const BMI_CLASS_LABEL: Record<BmiClass, string> = {
  underweight: 'Недостатня вага',
  healthy: 'Здорова вага',
  overweight: 'Надмірна вага',
  obese: 'Ожиріння',
};
