import React from 'react';

export const LoadingFinance = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="relative w-32 h-32">
        {/* Animated circular background */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
        
        {/* Spinning outer circle */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
        
        {/* Financial SVG Icons */}
        <svg
          className="absolute inset-0 w-full h-full p-6"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Coin */}
          <circle
            cx="50"
            cy="50"
            r="25"
            stroke="currentColor"
            strokeWidth="3"
            className="text-primary"
            fill="none"
          >
            <animate
              attributeName="r"
              values="25;28;25"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;0.6;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          
          {/* Dollar sign */}
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-3xl font-bold fill-primary"
            style={{ fontFamily: 'system-ui' }}
          >
            S/
          </text>
          
          {/* Orbiting dots */}
          <circle cx="50" cy="20" r="3" className="fill-primary">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          
          <circle cx="80" cy="50" r="3" className="fill-primary">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="120 50 50"
              to="480 50 50"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          
          <circle cx="50" cy="80" r="3" className="fill-primary">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="240 50 50"
              to="600 50 50"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">Cargando datos financieros...</p>
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};
