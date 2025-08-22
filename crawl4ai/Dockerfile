# Use the official crawl4ai Docker image
FROM unclecode/crawl4ai:0.7.3

# Expose the default crawl4ai port
EXPOSE 11235

# The official image already has everything configured
# Use the default command from the base image
CMD ["supervisord", "-c", "supervisord.conf"]