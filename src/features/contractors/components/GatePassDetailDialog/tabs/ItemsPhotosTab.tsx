import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ImageIcon } from "lucide-react";
import { GatePassPhoto as GatePassPhotoComponent } from "@/components/ui/gate-pass-photo";
import {
  useGatePassItems,
  useGatePassPhotos,
} from "@/features/contractors/hooks/use-gate-pass-details";

// Items & Photos Tab Component
export function ItemsPhotosTab({
  items,
  photos,
  materialDescription,
  isLoadingItems,
  isLoadingPhotos,
  t,
}: {
  items: ReturnType<typeof useGatePassItems>["data"];
  photos: ReturnType<typeof useGatePassPhotos>["data"];
  materialDescription?: string | null;
  isLoadingItems: boolean;
  isLoadingPhotos: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const generalPhotos = photos?.filter((p) => !p.item_id) || [];

  return (
    <div className="space-y-6 pe-4">
      {/* Items Section with Attached Photos */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t("contractors.gatePassDetail.items", "Items")}
        </h4>
        {isLoadingItems ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => {
              const itemPhotos = photos?.filter((p) => p.item_id === item.id) || [];

              return (
                <div key={item.id} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.item_name}</p>
                      {item.sr_number && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">SN: {item.sr_number}</p>
                      )}
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </div>
                    {item.quantity && (
                      <Badge variant="outline" className="text-xs">
                        {item.quantity} {item.unit || ""}
                      </Badge>
                    )}
                  </div>

                  {/* Item Photos */}
                  {itemPhotos.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {t("contractors.gatePasses.photos", "Photos")}
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {itemPhotos.map((photo) => (
                          <GatePassPhotoComponent
                            key={photo.id}
                            signedUrl={photo.signedUrl}
                            alt={photo.file_name}
                            className="aspect-square"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : items && items.length === 0 ? (
          materialDescription ? (
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">
                {t("contractors.gatePassDetail.materialDescription", "Material Description")}
              </p>
              <p className="font-medium text-sm">{materialDescription}</p>
            </div>
          ) : (!photos || photos.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("contractors.gatePassDetail.noItems", "No items or photos listed")}
            </p>
          ) : null
        ) : null}
      </div>

      {/* Public Gate Pass Photos - Direct from storage if no items found OR just generally for public requests */}
      {/* Show if we have photos but no items, OR if we have photos that aren't linked to items displayed above */}
      {photos && photos.length > 0 && (!items || items.length === 0) && (
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {t("contractors.gatePasses.photos", "Submitted Photos")}
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {photos.map((photo) => (
              <GatePassPhotoComponent
                key={photo.id}
                signedUrl={photo.signedUrl}
                alt={photo.file_name}
                className="aspect-square"
              />
            ))}
          </div>
        </div>
      )}
      {/* General / Legacy Photos Section (Public Gate Pass photos are handled above or here if consistent) */}

      {/* General / Legacy Photos Section */}
      {
        (isLoadingPhotos || generalPhotos.length > 0) && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {t("contractors.gatePasses.generalDocuments", "General Documents")}
            </h4>
            {isLoadingPhotos ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : generalPhotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {generalPhotos.map((photo) => (
                  <GatePassPhotoComponent
                    key={photo.id}
                    signedUrl={photo.signedUrl}
                    alt={photo.file_name}
                    className="aspect-square"
                  />
                ))}
              </div>
            ) : null}
          </div>
        )
      }
    </div >
  );
}

