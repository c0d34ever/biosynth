import { getPool } from '../db/connection.js';
import { getAIClient, generateContentWithErrorHandling, DEFAULT_MODEL } from './geminiService.js';

// Advanced analytics service
export const advancedAnalyticsService = {
  /**
   * Generate performance prediction
   */
  async predictPerformance(
    algorithmId: number,
    userId: number
  ): Promise<{ predictedValue: number; confidenceScore: number }> {
    const pool = getPool();

    // Get algorithm metrics history
    const [metrics] = await pool.query(
      `SELECT metric_type, metric_value, recorded_at
       FROM algorithm_metrics
       WHERE algorithm_id = ?
       ORDER BY recorded_at DESC
       LIMIT 50`,
      [algorithmId]
    ) as any[];

    // Get algorithm scores
    const [scores] = await pool.query(
      `SELECT * FROM algorithm_scores
       WHERE algorithm_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [algorithmId]
    ) as any[];

    // Get algorithm details
    const [algorithms] = await pool.query(
      `SELECT name, domain, type, view_count, like_count
       FROM algorithms WHERE id = ?`,
      [algorithmId]
    ) as any[];

    if (algorithms.length === 0) {
      throw new Error('Algorithm not found');
    }

    const algorithm = algorithms[0];

    // Use AI to predict performance
    const prompt = this._buildPredictionPrompt(algorithm, metrics, scores);
    const client = await getAIClient(userId);

    const response = await generateContentWithErrorHandling(client, {
      model: DEFAULT_MODEL,
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          predictedValue: { type: "number", description: "Predicted performance score (0-100)" },
          confidenceScore: { type: "number", description: "Confidence in prediction (0-100)" },
          factors: { type: "array", items: { type: "string" }, description: "Key factors influencing prediction" }
        },
        required: ["predictedValue", "confidenceScore"]
      }
    });

    // Save prediction
    await pool.query(
      `INSERT INTO analytics_predictions
       (algorithm_id, prediction_type, predicted_value, confidence_score, prediction_model, input_features)
       VALUES (?, 'performance', ?, ?, 'ai_model', ?)`,
      [
        algorithmId,
        response.predictedValue,
        response.confidenceScore,
        JSON.stringify({ metrics: metrics.length, scores: scores.length })
      ]
    );

    return {
      predictedValue: response.predictedValue,
      confidenceScore: response.confidenceScore
    };
  },

  /**
   * Analyze trends
   */
  async analyzeTrends(
    algorithmId: number | null,
    userId: number,
    options?: { periodDays?: number; trendType?: 'performance' | 'usage' | 'popularity' | 'score' }
  ): Promise<any[]> {
    const pool = getPool();
    const periodDays = options?.periodDays || 30;
    const trendType = options?.trendType || 'performance';

    let query = '';
    let params: any[] = [];

    if (algorithmId) {
      // Algorithm-specific trends
      if (trendType === 'performance') {
        query = `
          SELECT 
            DATE(recorded_at) as date,
            AVG(metric_value) as avg_value,
            COUNT(*) as data_points
          FROM algorithm_metrics
          WHERE algorithm_id = ? AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY DATE(recorded_at)
          ORDER BY date ASC
        `;
        params = [algorithmId, periodDays];
      } else if (trendType === 'score') {
        query = `
          SELECT 
            DATE(created_at) as date,
            AVG(overall_score) as avg_value,
            COUNT(*) as data_points
          FROM algorithm_scores
          WHERE algorithm_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `;
        params = [algorithmId, periodDays];
      }
    } else {
      // User-wide trends
      query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as avg_value,
          COUNT(*) as data_points
        FROM algorithms
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
      params = [userId, periodDays];
    }

    const [trends] = await pool.query(query, params) as any[];

    // Calculate trend direction
    const processedTrends = trends.map((trend: any, index: number) => {
      const prevTrend = index > 0 ? trends[index - 1] : null;
      let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let changePercentage = 0;

      if (prevTrend) {
        const change = trend.avg_value - prevTrend.avg_value;
        changePercentage = prevTrend.avg_value > 0
          ? (change / prevTrend.avg_value) * 100
          : 0;

        if (changePercentage > 5) direction = 'increasing';
        else if (changePercentage < -5) direction = 'decreasing';
      }

      return {
        ...trend,
        direction,
        changePercentage
      };
    });

    // Save trends
    for (const trend of processedTrends) {
      if (trend.direction !== 'stable') {
        await pool.query(
          `INSERT INTO analytics_trends
           (algorithm_id, trend_type, period_start, period_end, trend_direction, change_percentage, data_points)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           trend_direction = VALUES(trend_direction),
           change_percentage = VALUES(change_percentage)`,
          [
            algorithmId,
            trendType,
            trend.date,
            trend.date,
            trend.direction,
            trend.changePercentage,
            JSON.stringify([trend.avg_value])
          ]
        );
      }
    }

    return processedTrends;
  },

  /**
   * Forecast future performance
   */
  async forecastPerformance(
    algorithmId: number,
    userId: number,
    forecastDays: number = 30
  ): Promise<Array<{ date: string; predictedValue: number; confidence: number }>> {
    const pool = getPool();

    // Get historical data
    const [metrics] = await pool.query(
      `SELECT DATE(recorded_at) as date, AVG(metric_value) as value
       FROM algorithm_metrics
       WHERE algorithm_id = ?
       GROUP BY DATE(recorded_at)
       ORDER BY date DESC
       LIMIT 60`,
      [algorithmId]
    ) as any[];

    if (metrics.length < 7) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Use AI for forecasting
    const prompt = this._buildForecastPrompt(metrics, forecastDays);
    const client = await getAIClient(userId);

    const response = await generateContentWithErrorHandling(client, {
      model: DEFAULT_MODEL,
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          forecasts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                predictedValue: { type: "number" },
                confidence: { type: "number" }
              }
            }
          }
        },
        required: ["forecasts"]
      }
    });

    return response.forecasts;
  },

  /**
   * Build prediction prompt
   */
  _buildPredictionPrompt(algorithm: any, metrics: any[], scores: any[]): string {
    return `Analyze the following algorithm data and predict its future performance.

Algorithm:
- Name: ${algorithm.name}
- Domain: ${algorithm.domain}
- Type: ${algorithm.type}
- Views: ${algorithm.view_count}
- Likes: ${algorithm.like_count}

Historical Metrics (${metrics.length} records):
${metrics.slice(0, 10).map((m: any) => `${m.metric_type}: ${m.metric_value}`).join('\n')}

Historical Scores (${scores.length} records):
${scores.slice(0, 5).map((s: any) => `Overall: ${s.overall_score}, Feasibility: ${s.feasibility_score}`).join('\n')}

Based on this data, predict the algorithm's future performance score (0-100) and your confidence in this prediction.`;
  },

  /**
   * Build forecast prompt
   */
  _buildForecastPrompt(metrics: any[], forecastDays: number): string {
    return `Based on the following historical performance data, forecast the next ${forecastDays} days.

Historical Data:
${metrics.reverse().map((m: any) => `${m.date}: ${m.value}`).join('\n')}

Generate daily forecasts with predicted values and confidence scores.`;
  }
};

