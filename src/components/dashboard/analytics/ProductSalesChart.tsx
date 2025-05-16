
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ProductSalesData {
  productId: string;
  name: string;
  totalSold: number;
  category: string;
  price: number;
  stock: number;
}

interface ProductSalesChartProps {
  title: string;
  products: ProductSalesData[];
  type: 'most' | 'least';
  icon: React.ReactNode;
}

const ProductSalesChart: React.FC<ProductSalesChartProps> = ({
  title,
  products = [],
  type,
  icon
}) => {
  // Format data for chart
  const chartData = products.map(product => ({
    name: product.name.length > 12 ? `${product.name.slice(0, 12)}...` : product.name,
    value: product.totalSold,
    fullName: product.name,
    category: product.category,
    stock: product.stock
  }));

  // Sort data so the highest/lowest value appears at the top in the chart
  const sortedChartData = [...chartData].sort((a, b) => 
    type === 'most' ? b.value - a.value : a.value - b.value
  );

  // Define chart colors based on type
  const getBarColor = (type: 'most' | 'least', index: number) => {
    if (type === 'most') {
      // Gradient of greens for most sold
      const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];
      return colors[index % colors.length];
    } else {
      // Gradient of ambers for least sold
      const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'];
      return colors[index % colors.length];
    }
  };

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {icon}
          </div>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {icon}
        </div>
        <CardDescription>Based on order history</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[250px] w-full">
          <ChartContainer 
            config={{
              products: {
                label: 'Products',
                color: '#10b981',
              }
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sortedChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => value.toString()}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-md">
                          <div className="font-medium">{data.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            Category: {data.category || 'N/A'}
                          </div>
                          <div className="mt-1 font-medium">
                            Sold: {data.value} units
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Current Stock: {data.stock}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="value" 
                  name="Units Sold"
                >
                  {sortedChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColor(type, index)} 
                    />
                  ))}
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    style={{ fill: 'var(--foreground)', fontSize: '12px' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductSalesChart;
