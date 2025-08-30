'use client';

import React from 'react';
import { defineStepper } from '@stepperize/react';

// Simple test stepper
const { Stepper } = defineStepper(
  { id: 'step1', title: 'Step 1' },
  { id: 'step2', title: 'Step 2' }
);

export function TestStepper() {
  return (
    <div className="p-4">
      <h2>Test Stepper</h2>
      <Stepper.Provider>
        {({ methods }) => (
          <div>
            <p>Current step: {methods.current?.title}</p>
            <button onClick={methods.next}>Next</button>
            <button onClick={methods.prev}>Previous</button>
          </div>
        )}
      </Stepper.Provider>
    </div>
  );
}
