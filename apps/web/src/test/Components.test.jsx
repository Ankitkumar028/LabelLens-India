import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from '../components/Navbar';
import ScoreGauge from '../components/ScoreGauge';
import PresetsBar from '../components/PresetsBar';
import RedFlagsList from '../components/RedFlagsList';
import ProductComparison from '../components/ProductComparison';

import WhoImpactCalculator from '../components/WhoImpactCalculator';
import LabelComplianceCard from '../components/LabelComplianceCard';
import ScanConfidenceCard from '../components/ScanConfidenceCard';

describe('Frontend Components', () => {
  it('renders Navbar with LabelLens branding and healthy status', () => {
    render(<Navbar healthStatus={{ status: 'healthy', llm_provider: 'mock' }} />);
    expect(screen.getByText('Lens')).toBeDefined();
    expect(screen.getByText('INDIA')).toBeDefined();
    expect(screen.getByText('API: Connected')).toBeDefined();
  });

  it('renders ScoreGauge with score, grade and disclaimer', () => {
    const score = {
      value: 75,
      grade: 'GREEN',
      grade_description: 'Healthier choice based on visible declaration',
      breakdown: { base_score: 100, rule_penalties: -15, nutrient_adjustments: -10 },
    };
    render(<ScoreGauge score={score} disclaimer="Informational only, not medical advice." />);
    expect(screen.getByText('75')).toBeDefined();
    expect(screen.getByText(/GREEN/)).toBeDefined();
    expect(screen.getByText('Informational only, not medical advice.')).toBeDefined();
  });

  it('renders PresetsBar with Indian sample products', () => {
    render(<PresetsBar onSelectPreset={() => {}} isLoading={false} />);
    expect(screen.getByText('Choco Crunch Biscuits')).toBeDefined();
    expect(screen.getByText('Protein Seed Muesli')).toBeDefined();
  });

  it('renders RedFlagsList with red flags and severity badges', () => {
    const flags = [
      {
        id: 'sugar_in_first_three_ingredients',
        severity: 'HIGH',
        category: 'sugar',
        title: 'Sugar Among First 3 Ingredients',
        description: 'Sugar is listed in top 3 ingredients by weight.',
        penalty: 20,
      },
    ];
    render(<RedFlagsList redFlags={flags} />);
    expect(screen.getByText('Sugar Among First 3 Ingredients')).toBeDefined();
    expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
    expect(screen.getByText('-20 pts')).toBeDefined();
  });

  it('renders ProductComparison with slots, winner banner, and action buttons', () => {
    render(<ProductComparison />);
    expect(screen.getByText('Side-by-Side Product Comparison')).toBeDefined();
    expect(screen.getByText('Product A')).toBeDefined();
    expect(screen.getByText('Product B')).toBeDefined();
    expect(screen.getAllByText('Upload Photo').length).toBe(2);
    expect(screen.getAllByText('Barcode').length).toBe(2);
    expect(screen.getAllByText('Custom Values').length).toBe(2);
  });

  it('renders WhoImpactCalculator with portion slider and nutrients', () => {
    const extraction = {
      nutrients_per_100g: {
        sodium_mg: 800,
        sugars_g: 24,
        saturated_fat_g: 8,
        fiber_g: 4,
      },
    };
    render(<WhoImpactCalculator extraction={extraction} servingSizeG={30} />);
    expect(screen.getByText('Interactive WHO Daily Intake Calculator')).toBeDefined();
    expect(screen.getByText('Sodium')).toBeDefined();
    expect(screen.getByText('Added / Free Sugars')).toBeDefined();
  });

  it('renders LabelComplianceCard with FSSAI checklist items', () => {
    const compliance = {
      overall_status: 'COMPLIANT',
      checks: [
        {
          name: 'FSSAI License Number',
          clause: 'FSSAI Reg. 2020 cl. 5(4)',
          status: 'PASSED',
          details: '14-digit FSSAI licence detected on packaging.',
        },
      ],
    };
    render(<LabelComplianceCard compliance={compliance} />);
    expect(screen.getByText('FSSAI 2020 Packaging & Labelling Compliance')).toBeDefined();
    expect(screen.getByText('FSSAI License Number')).toBeDefined();
    expect(screen.getByText('PASSED')).toBeDefined();
  });

  it('renders ScanConfidenceCard with confidence indicators', () => {
    const report = {
      overall_confidence: 'HIGH',
      field_confidence: {
        energy_kcal: 'HIGH',
        sugars_g: 'HIGH',
      },
      unclear_fields: [],
    };
    render(<ScanConfidenceCard confidenceReport={report} processingTimeMs={210} scanId="test-12345" />);
    expect(screen.getByText('Extraction Provenance & Confidence')).toBeDefined();
    expect(screen.getByText('HIGH Confidence')).toBeDefined();
  });
});
