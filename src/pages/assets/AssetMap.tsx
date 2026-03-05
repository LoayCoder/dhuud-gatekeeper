import { useNavigate } from 'react-router-dom';
import { AssetLocationMap } from '@/features/assets';

export default function AssetMap() {
  const navigate = useNavigate();

  return (
    <AssetLocationMap 
      fullscreen 
      onClose={() => navigate('/assets/dashboard')} 
    />
  );
}

