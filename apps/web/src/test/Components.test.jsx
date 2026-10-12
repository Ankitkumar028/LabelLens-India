import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from '../components/Navbar';
import ScoreGauge from '../components/ScoreGauge';
import PresetsBar from '../components/PresetsBar';
import RedFlagsList from '../components/RedFlagsList';

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
});
