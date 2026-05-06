import axios from "axios";

export const forwardRequest = async (req, res, serviceUrl) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${serviceUrl}${req.originalUrl}`,
      data: req.body,
      headers: {
        Authorization: req.headers.authorization || "",
        "Content-Type": "application/json",
      },
    });

    return res.status(response.status).json(response.data);

  } catch (err) {
    return res.status(err.response?.status || 500).json({
      error: err.response?.data || "Service error",
    });
  }
};