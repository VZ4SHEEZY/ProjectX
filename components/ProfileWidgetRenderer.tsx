import React from 'react';
import SocialHubWidget from './SocialHubWidget';
import TopFriendsWidget from './TopFriendsWidget';

const WIDGET_MAP: { [key: string]: React.ComponentType<any> } = {
  topfriends: TopFriendsWidget,
  socialhub: SocialHubWidget,
};

const WIDGET_HEIGHTS: { [key: string]: string } = {
  topfriends: 'h-72',
  socialhub: 'h-64',
};

export const renderWidget = (widgetId: string) => {
  const Component = WIDGET_MAP[widgetId];
  if (!Component) return null;
  const heightClass = WIDGET_HEIGHTS[widgetId] || 'h-64';
  return <div className={`${heightClass}`}><Component /></div>;
};

interface ProfileWidgetColumnProps {
  widgets?: string[];
  defaultWidgets: React.ReactNode[];
}

export const ProfileWidgetColumn: React.FC<ProfileWidgetColumnProps> = ({ widgets, defaultWidgets }) => {
  if (widgets && widgets.length > 0) {
    return (
      <>
        {widgets.map((widgetId: string) => (
          <div key={widgetId}>{renderWidget(widgetId)}</div>
        ))}
      </>
    );
  }
  
  return <>{defaultWidgets}</>;
};

export default { renderWidget, ProfileWidgetColumn };
