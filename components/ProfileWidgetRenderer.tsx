import React from 'react';
import SocialHubWidget from './SocialHubWidget';
import TopFriendsWidget from './TopFriendsWidget';
import MusicPlayerWidget from './MusicPlayerWidget';
import AssetGalleryWidget from './AssetGalleryWidget';
import DataLogWidget from './DataLogWidget';
import GeoNodeWidget from './GeoNodeWidget';

const WIDGET_MAP: { [key: string]: React.ComponentType<any> } = {
  music: MusicPlayerWidget,
  topfriends: TopFriendsWidget,
  socialhub: SocialHubWidget,
  geonode: GeoNodeWidget,
  assets: AssetGalleryWidget,
  datalog: DataLogWidget,
};

const WIDGET_HEIGHTS: { [key: string]: string } = {
  music: 'h-48',
  topfriends: 'h-72',
  socialhub: 'h-64',
  geonode: 'h-48',
  assets: 'h-64',
  datalog: 'h-64',
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
