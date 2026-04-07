import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ImageIcon, Hash, BoxIcon } from "lucide-react";
import { GatePassPhoto as GatePassPhotoComponent } from "@/components/ui/gate-pass-photo";
import {
  useGatePassItems,
  useGatePassPhotos,
} from "@/features/contractors/hooks/use-gate-pass-details";

export function ItemsPhotosTab({
  items,
  photos,
  materialDescription,
  isLoadingItems,
  isLoadingPhotos,
  t,
}: {
  items: any;
  photos: any;
  materialDescription?: string | null;
  isLoadingItems: boolean;
  isLoadingPhotos: boolean;
  t: any;
}) {
  const generalPhotos = photos?.filter((p: any) => !p.item_id) || [];

  return (
    <div className="space-y-6 pe-4">
      {/* Items Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          {t("contractors.gatePassDetail.items", "Items")}
          {items && items.length > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {items.length}
            </Badge>
          )}
        </h4>

        {isLoadingItems ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item: any, index: number) => {
              const itemPhotos =
                photos?.filter((p: any) => p.item_id === item.id) || [];

              return (
                <div
                  key={item.id}
                  className="rounded-lg border bg-card shadow-sm overflow-hidden"
                >
                  {/* Item Header */}
                  <div className="flex items-start gap-3 p-4">
                    {/* Index Number */}
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Item Name */}
                      <p className="font-semibold text-sm text-foreground leading-tight">
                        {item.item_name}
                      </p>

                      {/* Description */}
                      {item.description && (
                        <div>
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            {t("contractors.gatePassDetail.description", "Description")}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      )}

                      {/* Serial Number & Quantity row */}
                      <div className="flex flex-wrap items-center gap-3">
                        {item.sr_number && (
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                              {item.sr_number}
                            </span>
                          </div>
                        )}
                        {item.quantity && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-0 text-xs font-medium">
                            <BoxIcon className="h-3 w-3 me-1" />
                            {item.quantity} {item.unit || ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Item Photos */}
                  {itemPhotos.length > 0 && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                          <ImageIcon className="h-3 w-3" />
                          {itemPhotos.length}{" "}
                          {t("contractors.gatePasses.photos", "Photos")}
                        </p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {itemPhotos.map((photo: any) => (
                            <GatePassPhotoComponent
                              key={photo.id}
                              signedUrl={photo.signedUrl}
                              alt={photo.file_name}
                              className="aspect-square"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : items && items.length === 0 ? (
          materialDescription ? (
            <div className="p-4 rounded-lg border bg-card shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t("contractors.gatePassDetail.materialDescription", "Material Description")}
              </span>
              <p className="font-medium text-sm mt-1">{materialDescription}</p>
            </div>
          ) : !photos || photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">
                {t("contractors.gatePassDetail.noItems", "No items or photos listed")}
              </p>
            </div>
          ) : null
        ) : null}
      </div>

      {/* Public Gate Pass Photos (no items) */}
      {photos && photos.length > 0 && (!items || items.length === 0) && (
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            {t("contractors.gatePasses.photos", "Submitted Photos")}
            <Badge variant="secondary" className="text-xs font-normal">
              {photos.length}
            </Badge>
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {photos.map((photo: any) => (
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

      {/* General / Legacy Photos */}
      {(isLoadingPhotos || generalPhotos.length > 0) && (
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            {t("contractors.gatePasses.generalDocuments", "General Documents")}
            {generalPhotos.length > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {generalPhotos.length}
              </Badge>
            )}
          </h4>
          {isLoadingPhotos ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : generalPhotos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {generalPhotos.map((photo: any) => (
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
      )}
    </div>
  );
}
