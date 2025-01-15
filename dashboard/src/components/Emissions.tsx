// Receives a current emissions value and a target emissions value and displays them in a bar chart

import React from 'react'
import { Group } from '@visx/group'
import { Bar } from '@visx/shape'
import { scaleLinear, scaleBand } from '@visx/scale'

type EmissionsProps = {
  currentEmissions: number
  targetEmissions: number
}

// Define the chart dimensions and margins
const width = 500
const height = 500
const margin = { top: 20, bottom: 20, left: 20, right: 20 }

// Making an height and width bound for the chart
const maxWidth = width - margin.left - margin.right
const maxHeight = height - margin.top - margin.bottom

/*
The BarGraph: 
- Maps over the data array.
- Calculates each bar's position and size using xPoint, yPoint, and barHeight.
- Uses the <Bar /> component from @visx/shape to render each bar.
*/
const BarGraph: React.FC<EmissionsProps> = ({
  currentEmissions,
  targetEmissions,
}) => {
  const data = [
    { label: 'Current Emissions', value: currentEmissions },
    { label: 'Target Emissions', value: targetEmissions },
  ]

  // These are helper functions that extract specific fields from the data objects
  const x = (d: { label: string; value: number }) => d.label
  const y = (d: { label: string; value: number }) => d.value

  // Maps the labels (e.g., 'Current Emissions') to positions on the horizontal axis.
  const xScale = scaleBand({
    range: [0, maxWidth],
    round: true,
    domain: data.map(x),
    padding: 0.4,
  })

  // Maps numerical values (e.g., currentEmissions) to vertical positions on the chart.
  const yScale = scaleLinear({
    range: [maxHeight, 0],
    round: true,
    domain: [0, Math.max(...data.map(y))],
  })

  /* 
  Combines the scales with the accessor functions to calculate the 
  exact position of each bar on the chart. 
  xPoint: Determines the x-coordinate of the bar.
  yPoint: Determines the y-coordinate of the top of the bar.
*/
  const xPoint = (d: { label: string; value: number }) => xScale(x(d)) ?? 0
  const yPoint = (d: { label: string; value: number }) => yScale(y(d)) ?? 0

  return (
    <svg width={width} height={height}>
      {data.map((d, i) => {
        const barHeight = maxHeight - yPoint(d)
        return (
          <Group key={`bar-${i}`}>
            <Bar
              x={xPoint(d)}
              y={maxHeight - barHeight}
              height={barHeight}
              width={xScale.bandwidth()}
              fill="#fc2e1c"
            />
          </Group>
        )
      })}
    </svg>
  )
}

export const Emissions: React.FC<EmissionsProps> = ({
  currentEmissions,
  targetEmissions,
}) => {
  return (
    <div>
      <h2>Emissions</h2>
      <BarGraph
        currentEmissions={currentEmissions}
        targetEmissions={targetEmissions}
      />
    </div>
  )
}
