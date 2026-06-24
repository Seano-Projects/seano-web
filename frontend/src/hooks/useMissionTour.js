import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import useTranslation from "./useTranslation";

const useMissionTour = () => {
  const { t } = useTranslation();

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayOpacity: 0.7,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: "mission-tour-popover",
      nextBtnText: t("missionComponents.tour.next"),
      prevBtnText: t("missionComponents.tour.prev"),
      doneBtnText: t("missionComponents.tour.done"),
      progressText: t("missionComponents.tour.progress"),
      onHighlightStarted: (el) => {
        el?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
      },
      steps: [
        {
          element: "#tour-vehicle-select",
          popover: {
            title: t("missionComponents.tour.step1Title"),
            description: t("missionComponents.tour.step1Desc"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-new-mission",
          popover: {
            title: t("missionComponents.tour.step2Title"),
            description: t("missionComponents.tour.step2Desc"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-load-mission",
          popover: {
            title: t("missionComponents.tour.step3Title"),
            description: t("missionComponents.tour.step3Desc"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-mission-info",
          popover: {
            title: t("missionComponents.tour.step4Title"),
            description: t("missionComponents.tour.step4Desc"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-home-location",
          popover: {
            title: t("missionComponents.tour.step5Title"),
            description: t("missionComponents.tour.step5Desc"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-waypoint-list",
          popover: {
            title: t("missionComponents.tour.step6Title"),
            description: t("missionComponents.tour.step6Desc"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-planning-mode",
          popover: {
            title: t("missionComponents.tour.step7Title"),
            description: t("missionComponents.tour.step7Desc"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-mission-stats",
          popover: {
            title: t("missionComponents.tour.step8Title"),
            description: t("missionComponents.tour.step8Desc"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-save-mission",
          popover: {
            title: t("missionComponents.tour.step9Title"),
            description: t("missionComponents.tour.step9Desc"),
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-upload-mission",
          popover: {
            title: t("missionComponents.tour.step10Title"),
            description: t("missionComponents.tour.step10Desc"),
            side: "right",
            align: "start",
          },
        },
      ],
    });

    driverObj.drive();
  };

  return { startTour };
};

export default useMissionTour;
