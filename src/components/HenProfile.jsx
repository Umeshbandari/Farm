import React, { useState } from 'react';

function formatAge(dob) {
  if (!dob) return 'NA';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 'NA';

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years}y ${months}m ${days}d`;
}

function formatGenderLabel(gender) {
  if (gender === 'kodi') return 'Hen (కోడి)';
  if (gender === 'punju') return 'Rooster (పుంజు)';
  if (gender === 'pilla') return 'Chick (పిల్ల)';
  return 'NA';
}

function parseDate(dateValue) {
  if (!dateValue) return null;
  const dateObj = new Date(dateValue);
  return Number.isNaN(dateObj.getTime()) ? null : dateObj;
}

function formatDate(dateValue) {
  const dateObj = parseDate(dateValue);
  return dateObj ? dateObj.toLocaleDateString() : 'NA';
}

function computeAverageGapDays(batchRecords) {
  if (!Array.isArray(batchRecords) || batchRecords.length < 2) return null;

  const sorted = [...batchRecords].sort((a, b) => Number(a.batchId || 0) - Number(b.batchId || 0));
  const dayMs = 1000 * 60 * 60 * 24;
  const gaps = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const currentHatching = parseDate(sorted[i].hatchingDate);
    const nextLaying = parseDate(sorted[i + 1].layingStartDate);
    if (!currentHatching || !nextLaying) continue;
    const diff = Math.floor((nextLaying - currentHatching) / dayMs);
    if (diff >= 0) gaps.push(diff);
  }

  if (gaps.length === 0) return null;
  return Math.round(gaps.reduce((sum, val) => sum + val, 0) / gaps.length);
}

function classifyPerformance(avgEggsPerBatch, overallRate) {
  if (avgEggsPerBatch < 5 && overallRate < 50) {
    return { label: 'Poor', telugu: 'బలబీన', color: 'bg-red-500', text: 'text-red-600', borderColor: 'border-red-400', lineColor: '#ef4444' };
  }
  if (avgEggsPerBatch >= 5 && avgEggsPerBatch <= 10 && overallRate >= 50 && overallRate <= 75) {
    return { label: 'Good', telugu: 'మంచిది', color: 'bg-stone-400', text: 'text-stone-600', borderColor: 'border-stone-400', lineColor: '#78716c' };
  }
  if (avgEggsPerBatch > 10 && overallRate > 75) {
    return { label: 'Better', telugu: ' చాలా బాగుంది', color: 'bg-green-500', text: 'text-green-600', borderColor: 'border-green-400', lineColor: '#22c55e' };
  }
  return { label: 'NA', telugu: 'NA', color: 'bg-stone-300', text: 'text-stone-500', borderColor: 'border-stone-300', lineColor: '#a8a29e' };
}

function getRateColor(rate) {
  if (rate < 50) return '#ef4444';
  if (rate <= 75) return '#78716c';
  return '#22c55e';
}

function getEggColor(eggs, prevEggs) {
  if (prevEggs === null) return '#f59e0b';
  return eggs > prevEggs ? '#22c55e' : eggs < prevEggs ? '#ef4444' : '#f59e0b';
}

function StockChart({ title, data, type, color, yAxisLabel, showReferenceLines = true }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-stone-800 rounded-xl p-4">
        <div className="text-sm font-semibold text-stone-300 mb-2">{title}</div>
        <div className="h-40 flex items-center justify-center text-stone-500">
          Not enough data for trend
        </div>
      </div>
    );
  }

  const width = 340;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  let maxVal = Math.max(...data.map(d => d.value), 1);
  let minVal = Math.min(...data.map(d => d.value), 0);
  
  if (type === 'rate') {
    maxVal = 100;
    minVal = 0;
  }

  const range = maxVal - minVal || 1;
  
  const xScale = (i) => padding.left + (i / (data.length - 1 || 1)) * chartWidth;
  const yScale = (v) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`).join(' ');
  
  const areaPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`).join(' ') + 
    ` L ${xScale(data.length - 1)} ${yScale(minVal)} L ${xScale(0)} ${yScale(minVal)} Z`;

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : data[data.length - 1];
  const hoveredX = hoveredIndex !== null ? xScale(hoveredIndex) : xScale(data.length - 1);
  const hoveredY = hoveredIndex !== null ? yScale(hoveredPoint.value) : yScale(hoveredPoint.value);

  return (
    <div className="bg-stone-800 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-semibold text-amber-400">{title}</div>
        {hoveredPoint && (
          <div className="text-lg font-bold text-white">
            {type === 'rate' ? `${hoveredPoint.value.toFixed(1)}%` : hoveredPoint.value}
          </div>
        )}
      </div>
      
      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={padding.top + chartHeight * ratio}
              x2={width - padding.right}
              y2={padding.top + chartHeight * ratio}
              stroke="#52525b"
              strokeDasharray="4,4"
            />
          ))}

          {/* Reference lines for rate chart */}
          {showReferenceLines && type === 'rate' && (
            <>
              <line
                x1={padding.left}
                y1={yScale(50)}
                x2={width - padding.right}
                y2={yScale(50)}
                stroke="#a8a29e"
                strokeDasharray="6,4"
                strokeWidth="1"
              />
              <text x={width - padding.right + 2} y={yScale(50) + 3} fill="#a8a29e" fontSize="10">50%</text>
              <line
                x1={padding.left}
                y1={yScale(75)}
                x2={width - padding.right}
                y2={yScale(75)}
                stroke="#a8a29e"
                strokeDasharray="6,4"
                strokeWidth="1"
              />
              <text x={width - padding.right + 2} y={yScale(75) + 3} fill="#a8a29e" fontSize="10">75%</text>
            </>
          )}

          {/* Y-axis labels */}
          <text x={padding.left - 5} y={padding.top + 4} fill="#d4d4d8" fontSize="9" textAnchor="end">{maxVal}{type === 'rate' ? '%' : ''}</text>
          <text x={padding.left - 5} y={padding.top + chartHeight + 4} fill="#d4d4d8" fontSize="9" textAnchor="end">{minVal}{type === 'rate' ? '%' : ''}</text>

          {/* Area fill */}
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#gradient-${title})`} />

          {/* Line */}
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(d.value)}
              r="4"
              fill={color}
              stroke="#18181b"
              strokeWidth="2"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {/* Hover indicator line */}
          {hoveredIndex !== null && (
            <line
              x1={hoveredX}
              y1={padding.top}
              x2={hoveredX}
              y2={padding.top + chartHeight}
              stroke="#71717a"
              strokeDasharray="4,4"
            />
          )}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={xScale(i)}
              y={height - 10}
              fill="#d4d4d8"
              fontSize="8"
              textAnchor="middle"
            >
              {d.label}
            </text>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && hoveredIndex !== null && (
          <div 
            className="absolute bg-stone-700 border border-stone-500 rounded-lg px-3 py-2 shadow-xl"
            style={{
              left: Math.min(hoveredX, width - 120),
              top: 0,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="text-xs text-stone-300">{hoveredPoint.label}</div>
            <div className="text-sm font-bold text-white">
              {type === 'rate' ? `${hoveredPoint.value.toFixed(1)}%` : hoveredPoint.value} {yAxisLabel}
            </div>
            {hoveredPoint.date && (
              <div className="text-xs text-stone-400">{hoveredPoint.date}</div>
            )}
            {hoveredPoint.status && (
              <div className={`text-xs font-semibold mt-1 ${hoveredPoint.status.text}`}>
                {hoveredPoint.status.label}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function buildBatchSeries(batchRecords) {
  const sorted = [...batchRecords].sort((a, b) => Number(a.batchId || 0) - Number(b.batchId || 0));
  
  const labels = sorted.map((record, idx) => `B${record.batchId || idx + 1}`);
  const dates = sorted.map((record) => record.layingStartDate ? new Date(record.layingStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
  
  const eggs = sorted.map((record) => Number(record.eggsLaid || 0));
  const rates = sorted.map((record) => {
    const totalEggs = Number(record.eggsLaid || 0);
    const hatched = Number(record.hatchingChicks || 0);
    return totalEggs > 0 ? Math.round((hatched / totalEggs) * 100) : 0;
  });

  const eggsData = eggs.map((val, idx) => ({
    label: labels[idx],
    value: val,
    date: dates[idx],
    status: classifyPerformance(val, rates[idx])
  }));

  const ratesData = rates.map((val, idx) => ({
    label: labels[idx],
    value: val,
    date: dates[idx],
    status: classifyPerformance(eggs[idx], val)
  }));

  return { labels, eggsData, ratesData };
}

export default function HenProfile({ hen }) {
  if (!hen) return null;

  const isKodi = hen.gender === 'kodi';
  const batchRecords = Array.isArray(hen.batchRecords) ? hen.batchRecords : [];
  const totalEggsLaid = batchRecords.reduce((sum, record) => sum + Number(record.eggsLaid || 0), 0);
  const totalChicksHatched = batchRecords.reduce((sum, record) => sum + Number(record.hatchingChicks || 0), 0);
  const avgEggsPerBatch = batchRecords.length > 0 ? totalEggsLaid / batchRecords.length : 0;
  const overallRate = totalEggsLaid > 0 ? (totalChicksHatched / totalEggsLaid) * 100 : 0;
  const avgGapDays = computeAverageGapDays(batchRecords);
  const classification = classifyPerformance(avgEggsPerBatch, overallRate);
  const series = buildBatchSeries(batchRecords);

  return (
    <div className="space-y-4">
      {/* Basic Info Card */}
      <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-300">
        <div className="flex items-center gap-4">
          {hen.photo ? (
            <img src={hen.photo} alt={hen.name} className="w-16 h-16 rounded-full object-cover border-2 border-amber-400" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-200 flex items-center justify-center text-2xl font-bold text-amber-700 border-2 border-amber-400">
              {(hen.name || 'H').charAt(0)}
            </div>
          )}
          <div>
            <div className="text-lg font-bold text-amber-900">{hen.name || 'Unnamed'}</div>
            <div className="text-sm text-amber-700">{formatGenderLabel(hen.gender)}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white rounded-lg p-3 border border-amber-200">
            <div className="text-xs text-amber-600">Age</div>
            <div className="text-sm font-bold text-amber-900">{formatAge(hen.dob)}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-amber-200">
            <div className="text-xs text-amber-600">DOB</div>
            <div className="text-sm font-bold text-amber-900">{formatDate(hen.dob)}</div>
          </div>
        </div>
      </div>

      {/* Performance Badge */}
      <div className={`rounded-xl p-4 border-2 ${classification.borderColor} ${classification.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${classification.color}`} />
            <span className={`font-bold ${classification.text}`}>{classification.label}</span>
            <span className="text-stone-600">/ {classification.telugu}</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-stone-900">{Math.round(overallRate)}%</div>
            <div className="text-xs text-stone-600">Hatching Rate</div>
          </div>
        </div>
      </div>

      {isKodi && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-100 rounded-xl p-3 text-center border border-amber-300">
              <div className="text-xs text-amber-700">Total Eggs</div>
              <div className="text-xl font-bold text-amber-800">{totalEggsLaid}</div>
            </div>
            <div className="bg-green-100 rounded-xl p-3 text-center border border-green-300">
              <div className="text-xs text-green-700">Chicks Hatched</div>
              <div className="text-xl font-bold text-green-800">{totalChicksHatched}</div>
            </div>
            <div className="bg-stone-100 rounded-xl p-3 text-center border border-stone-300">
              <div className="text-xs text-stone-600">Avg Gap</div>
              <div className="text-xl font-bold text-stone-800">{avgGapDays === null ? 'NA' : `${avgGapDays}d`}</div>
            </div>
          </div>

          {/* Egg Production Chart */}
          <StockChart
            title="Egg Production"
            data={series.eggsData}
            type="eggs"
            color="#f59e0b"
            yAxisLabel="eggs"
            showReferenceLines={false}
          />

          {/* Hatching Rate Chart */}
          <StockChart
            title="Hatching Rate %"
            data={series.ratesData}
            type="rate"
            color={getRateColor(overallRate)}
            yAxisLabel=""
            showReferenceLines={true}
          />

          {/* Batch Details */}
          {batchRecords.length > 0 && (
            <div className="bg-stone-100 rounded-xl p-4 border border-stone-300">
              <div className="text-sm font-semibold text-stone-700 mb-3">Batch Details</div>
              <div className="space-y-2">
                {series.eggsData.map((d, i) => (
                  <div key={i} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-stone-200">
                    <span className="text-stone-700 text-sm font-medium">{d.label}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-amber-600 font-semibold">{d.value} eggs</span>
                      <span className="font-semibold" style={{ color: getRateColor(series.ratesData[i].value) }}>
                        {series.ratesData[i].value}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="text-xs text-stone-600 text-center bg-stone-100 rounded-lg p-2 border border-stone-300">
            Poor: Eggs &lt; 5 & Rate &lt; 50% • Good: Eggs 5-10 & Rate 50-75% • Better: Eggs &gt; 10 & Rate &gt; 75%
          </div>
        </>
      )}
    </div>
  );
}