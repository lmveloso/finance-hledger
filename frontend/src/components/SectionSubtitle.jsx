import React from 'react';
import { color } from '../theme/tokens';

function SectionSubtitle({ as: Component = 'h2', children, style, ...props }) {
  return (
    <Component
      className="sans"
      style={{
        fontSize: 11,
        letterSpacing: '0.15em',
        color: color.text.muted,
        textTransform: 'uppercase',
        fontWeight: 500,
        margin: 0,
        marginBottom: 12,
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

export default SectionSubtitle;
